# WebSocket Chat Relay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify web-desktop communication so web client only sends/receives via WebSocket, with desktop as relay/proxy to tRPC.

**Architecture:** Web client sends messages through WebSocket → Desktop app forwards to tRPC → Response broadcast to subscribed WebSocket clients. Single source of truth via shared subscription Observable.

**Tech Stack:** WebSocket (ws), tRPC, Electron IPC, Observable pattern

---

## Current Flow (Complex)

```
Web Client
    ├─→ Direct tRPC queries (projects.list, chats.list)
    ├─→ Direct tRPC mutations (sendMessage)
    └─→ tRPC subscription (claude.chat)
```

## Target Flow (Simplified)

```
Web Client
    ├─→ WebSocket.send(chatId, message)  → Desktop → tRPC
    └─→ WebSocket.subscribe(chatId)      ← Desktop ← tRPC
```

**Benefits:**
- Single channel for all communication
- Desktop controls everything (no direct tRPC access from web)
- Simpler client code
- Better security (web can't bypass desktop)

---

## Task 1: Simplify WebSocket Message Protocol

**Files:**
- Modify: `src/main/lib/remote-access/ws-server.ts`

**Step 1: Define new simplified message types**

Add to existing `WSRequest` interface:

```typescript
interface WSRequest {
  id: string
  type: "auth" | "send" | "subscribe" | "unsubscribe"
  chatId?: string        // For subscribe/unsubscribe/send
  message?: any          // For send (chat message content)
  pin?: string           // For auth
}

interface WSResponse {
  id: string | null
  type: "auth_required" | "auth_success" | "auth_failed" | "subscribed" | "error" | "data"
  chatId?: string        // Which chat this data is for
  data?: unknown
  error?: string
}
```

**Step 2: Remove "trpc" type handling**

Delete the large `if (message.type === "trpc" && message.method)` block in `handleMessage()`. This will be replaced with simpler "send" handling.

**Step 3: Commit**

```bash
git add src/main/lib/remote-access/ws-server.ts
git commit -m "refactor: remove direct tRPC access from WebSocket"
```

---

## Task 2: Implement Chat Message Send Handler

**Files:**
- Modify: `src/main/lib/remote-access/ws-server.ts`

**Step 1: Add send message handler**

In `handleMessage()`, add after auth check:

```typescript
// Send chat message
if (message.type === "send" && message.chatId && message.message) {
  try {
    const { chatId, message: msgContent } = message

    console.log(`[WS] Received message for chat ${chatId}:`, msgContent)

    // Forward to tRPC via desktop's tRPC router
    const router = createAppRouter(() => BrowserWindow.getFocusedWindow())
    const caller = router.createCaller({
      getWindow: () => BrowserWindow.getFocusedWindow(),
    })

    // Call claude.sendMessage (this will trigger the subscription to broadcast)
    const result = await caller.claude.sendMessage({
      subChatId: chatId,
      message: msgContent,
    })

    // Send success response
    send(ws, {
      id: message.id,
      type: "data",
      chatId,
      data: { sent: true },
    })

    // Note: Actual response will come through subscription broadcast
    return
  } catch (error) {
    send(ws, {
      id: message.id,
      type: "error",
      error: error instanceof Error ? error.message : "Failed to send message",
    })
    return
  }
}
```

**Step 2: Commit**

```bash
git add src/main/lib/remote-access/ws-server.ts
git commit -m "feat: add WebSocket send message handler"
```

---

## Task 3: Update Subscribe Handler to Use New Protocol

**Files:**
- Modify: `src/main/lib/remote-access/ws-server.ts`

**Step 1: Simplify subscribe handler**

Replace the complex `if (routerName === "claude" && procedureName === "chat")` block with:

```typescript
// Subscribe to chat
if (message.type === "subscribe" && message.chatId) {
  const subChatId = message.chatId

  console.log(`[WS] Starting subscription for subChatId: ${subChatId}`)

  // Check if there's already a shared subscription
  let sharedSub = sharedChatSubscriptions.get(subChatId)

  if (!sharedSub) {
    // Create new shared subscription
    console.log(`[WS] Creating new shared subscription for ${subChatId}`)

    const router = createAppRouter(() => BrowserWindow.getFocusedWindow())
    const claudeRouter = (router as any).claude
    const chatProcedure = claudeRouter.chat
    const subscriptionFn = chatProcedure._def.resolver

    const ctx = {
      getWindow: () => BrowserWindow.getFocusedWindow(),
    }

    const observable = subscriptionFn({
      input: { subChatId },
      type: 'subscription',
      ctx,
      path: 'claude.chat',
    })

    if (typeof observable?.subscribe !== 'function') {
      throw new Error(`chat subscription did not return Observable`)
    }

    // Subscribe and broadcast
    const subscription = observable.subscribe({
      next: (data: any) => {
        if (sharedSub) {
          for (const [clientWs, subId] of sharedSub.clients) {
            send(clientWs, {
              id: subId,
              type: "data",
              chatId: subChatId,
              data: data,
            })
          }
          // Also notify IPC listeners (desktop)
          for (const listener of sharedSub.listeners) {
            try {
              listener(data)
            } catch (err) {
              console.error(`[WS] Error in IPC listener:`, err)
            }
          }
        }
      },
      error: (err: any) => {
        console.error(`[WS] Chat subscription error:`, err)
        if (sharedSub) {
          for (const [clientWs, subId] of sharedSub.clients) {
            send(clientWs, {
              id: subId,
              type: "error",
              chatId: subChatId,
              error: err.message,
            })
          }
        }
      },
      complete: () => {
        console.log(`[WS] Chat subscription complete for ${subChatId}`)
        if (sharedSub) {
          for (const [clientWs, subId] of sharedSub.clients) {
            send(clientWs, {
              id: subId,
              type: "data",
              chatId: subChatId,
              data: { completed: true },
            })
          }
        }
      }
    })

    sharedSub = {
      observable,
      subscription,
      clients: new Map(),
      listeners: sharedChatSubscriptions.get(subChatId)?.listeners || new Set(),
    }
    sharedChatSubscriptions.set(subChatId, sharedSub)
  }

  // Add client to shared subscription
  sharedSub.clients.set(ws, message.id)

  send(ws, {
    id: message.id,
    type: "subscribed",
    chatId: subChatId,
  })

  // Clean up on disconnect
  ws.on("close", () => {
    if (sharedSub) {
      sharedSub.clients.delete(ws)
      if (sharedSub.clients.size === 0 && sharedSub.listeners.size === 0) {
        sharedSub.subscription.unsubscribe()
        sharedChatSubscriptions.delete(subChatId)
      }
    }
  })

  return
}
```

**Step 2: Commit**

```bash
git add src/main/lib/remote-access/ws-server.ts
git commit -m "refactor: simplify subscribe handler"
```

---

## Task 4: Add Unsubscribe Handler

**Files:**
- Modify: `src/main/lib/remote-access/ws-server.ts`

**Step 1: Add unsubscribe handler**

```typescript
// Unsubscribe from chat
if (message.type === "unsubscribe" && message.chatId) {
  const subChatId = message.chatId
  const sharedSub = sharedChatSubscriptions.get(subChatId)

  if (sharedSub) {
    sharedSub.clients.delete(ws)

    // Clean up if no clients left
    if (sharedSub.clients.size === 0 && sharedSub.listeners.size === 0) {
      sharedSub.subscription.unsubscribe()
      sharedChatSubscriptions.delete(subChatId)
    }

    send(ws, {
      id: message.id,
      type: "data",
      chatId: subChatId,
      data: { unsubscribed: true },
    })
  }

  return
}
```

**Step 2: Commit**

```bash
git add src/main/lib/remote-access/ws-server.ts
git commit -m "feat: add unsubscribe handler"
```

---

## Task 5: Update Client-Side ws-link

**Files:**
- Modify: `src/renderer/lib/remote-transport/ws-link.ts`

**Step 1: Simplify message types**

```typescript
type WSMessageType = "auth" | "send" | "subscribe" | "unsubscribe"

interface WSRequest {
  id: string
  type: WSMessageType
  chatId?: string
  message?: any
  pin?: string
}

interface WSResponse {
  id: string | null
  type: "auth_required" | "auth_success" | "auth_failed" | "subscribed" | "error" | "data"
  chatId?: string
  data?: unknown
  error?: string
}
```

**Step 2: Add send message function**

```typescript
/**
 * Send a chat message via WebSocket
 */
export async function sendChatMessage(chatId: string, message: any): Promise<void> {
  await connect()

  return new Promise((resolve, reject) => {
    const id = `send-${++requestId}-${Date.now()}`
    const request: WSRequest = { id, type: "send", chatId, message }

    const timeout = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new Error("Send timeout"))
    }, 30000)

    pendingRequests.set(id, {
      resolve: (data) => {
        clearTimeout(timeout)
        resolve(data)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    })

    ws!.send(JSON.stringify(request))
  })
}
```

**Step 3: Simplify subscription handler**

Replace complex tRPC subscription with:

```typescript
/**
 * Subscribe to chat updates via WebSocket
 */
export function subscribeToChat(chatId: string, onData: (data: any) => void): () => void {
  const id = `sub-${++requestId}-${Date.now()}`

  const handler: SubscriptionHandler = {
    onData: (data) => {
      console.log("[ws-link] Chat data received:", chatId, data)
      onData(data)
    },
    onError: (error) => {
      console.error("[ws-link] Chat error:", chatId, error)
    },
    onComplete: () => {
      console.log("[ws-link] Chat complete:", chatId)
    },
  }

  subscriptionHandlers.set(id, handler)

  // Wait for connection, then send subscribe request
  connect().then(() => {
    const request: WSRequest = { id, type: "subscribe", chatId }
    ws!.send(JSON.stringify(request))
    console.log("[ws-link] Subscribe request sent:", id, chatId)
  }).catch((error) => {
    console.error("[ws-link] Failed to connect for subscription:", error)
    subscriptionHandlers.delete(id)
  })

  // Return unsubscribe function
  return () => {
    console.log("[ws-link] Unsubscribing:", chatId, id)
    subscriptionHandlers.delete(id)
    if (ws?.readyState === WebSocket.OPEN) {
      const unsubscribeRequest: WSRequest = { id: `unsub-${Date.now()}`, type: "unsubscribe", chatId }
      ws.send(JSON.stringify(unsubscribeRequest))
    }
  }
}
```

**Step 4: Remove old tRPC link code**

Delete the entire `wsLink()` function and related `sendTRPCRequest()`. The new API is just `sendChatMessage()` and `subscribeToChat()`.

**Step 5: Commit**

```bash
git add src/renderer/lib/remote-transport/ws-link.ts
git commit -m "refactor: simplify ws-link for send/subscribe API"
```

---

## Task 6: Create Chat Transport Hook

**Files:**
- Create: `src/renderer/lib/hooks/use-chat-transport.ts`

**Step 1: Write the hook**

```typescript
import { useEffect, useRef } from "react"
import { subscribeToChat, sendChatMessage } from "../remote-transport/ws-link"

/**
 * Hook for chat communication via WebSocket
 * @param chatId - The sub-chat ID to communicate with
 * @returns Object with sendMessage function
 */
export function useChatTransport(chatId: string | null) {
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!chatId) return

    // Subscribe to chat updates
    unsubscribeRef.current = subscribeToChat(chatId, (data) => {
      console.log("[useChatTransport] Received data:", chatId, data)
      // Data will be handled by the existing chat subscription system
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [chatId])

  const sendMessage = async (message: any) => {
    if (!chatId) {
      throw new Error("No active chat")
    }
    return sendChatMessage(chatId, message)
  }

  return { sendMessage }
}
```

**Step 2: Commit**

```bash
git add src/renderer/lib/hooks/use-chat-transport.ts
git commit -m "feat: add useChatTransport hook"
```

---

## Task 7: Update Active Chat to Use New Transport

**Files:**
- Modify: `src/renderer/features/agents/main/active-chat.tsx`

**Step 1: Find where messages are sent**

Search for `trpc.claude.sendMessage` or similar mutation calls.

**Step 2: Replace with new transport**

```typescript
import { useChatTransport } from "@/lib/hooks/use-chat-transport"
import { useAtomValue } from "jotai"
import { selectedSubChatIdAtom } from "@/lib/atoms"

// Inside component
const selectedSubChatId = useAtomValue(selectedSubChatIdAtom)
const { sendMessage } = useChatTransport(selectedSubChatId?.id)

// Replace mutation call with:
const handleSend = async (message: string) => {
  try {
    await sendMessage({ message })
  } catch (error) {
    console.error("Failed to send message:", error)
  }
}
```

**Step 3: Commit**

```bash
git add src/renderer/features/agents/main/active-chat.tsx
git commit -m "refactor: use WebSocket transport for chat messages"
```

---

## Task 8: Remove Old tRPC Remote Links

**Files:**
- Modify: `src/renderer/lib/trpc.ts` or wherever tRPC client is configured
- Modify: `src/renderer/contexts/TRPCProvider.tsx`

**Step 1: Remove WebSocket link from tRPC client**

If tRPC client has `wsLink` mixed in, remove it for remote mode. Desktop still uses IPC, web uses WebSocket transport directly.

**Step 2: Commit**

```bash
git add src/renderer/lib/trpc.ts
git commit -m "refactor: remove WebSocket from tRPC client"
```

---

## Task 9: Test Web Client Send Message

**Files:**
- Test: Manual testing via browser

**Step 1: Start desktop app**

```bash
bun run dev
```

**Step 2: Open web app**

Navigate to `http://localhost:PORT/app` and enter PIN.

**Step 3: Send message from web**

Type a message in chat input and send.

**Expected:**
- Message appears in web app chat
- Message appears in desktop app chat simultaneously
- No errors in console

**Step 4: Verify logs**

Desktop terminal should show:
```
[WS] Received message for chat ml3xxx: { message: "hello" }
[WS] Broadcasting chat data to 1 WS clients, 1 IPC listeners
```

**Step 5: Debug if fails**

Check:
- WebSocket connection established
- Subscription active before send
- tRPC mutation succeeds
- Broadcast reaches both clients

---

## Task 10: Test Desktop Still Works

**Files:**
- Test: Manual testing

**Step 1: Send message from desktop**

Type in desktop chat input and send.

**Expected:**
- Message appears in desktop app
- Message appears in web app simultaneously

**Step 2: Verify no regression**

- Desktop chat still works via IPC
- Desktop and web stay in sync
- No performance issues

---

## Task 11: Cleanup Unused Code

**Files:**
- Modify: Multiple files

**Step 1: Remove unused imports and functions**

After confirming everything works:
- Remove old `sendTRPCRequest` if fully replaced
- Remove complex tRPC subscription handling in ws-link
- Clean up any commented-out code

**Step 2: Final commit**

```bash
git add -A
git commit -m "chore: cleanup unused WebSocket code"
```

---

## Testing Checklist

- [ ] Web client can subscribe to chat
- [ ] Web client can send messages
- [ ] Messages appear in both web and desktop simultaneously
- [ ] Desktop can still send messages
- [ ] Desktop messages appear in web
- [ ] Unsubscribe works correctly
- [ ] Reconnection after disconnect works
- [ ] No memory leaks (subscriptions cleaned up)
- [ ] Console shows expected logs

---

## Rollback Plan

If issues arise:
```bash
git revert HEAD  # Undo last commit
# Or
git reset --hard <working-commit-hash>
```

The old code is preserved in git history for easy rollback.

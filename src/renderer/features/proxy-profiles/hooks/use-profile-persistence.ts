import { useEffect, useRef } from "react"
import { useAtom } from "jotai"
import { trpc, trpcClient } from "../../../lib/trpc"
import {
  activeChatProfileTypeAtom,
  activeChatProxyProfileIdAtom,
  activeChatSelectedModelAtom,
  type ProfileType,
} from "../atoms"

/**
 * Hook to sync profile/model selection with the database
 * - Restores selection when subChatId changes
 * - Saves selection when atoms change or when leaving a chat
 */
export function useProfilePersistence(subChatId: string | null) {
  const [profileType, setProfileType] = useAtom(activeChatProfileTypeAtom)
  const [proxyProfileId, setProxyProfileId] = useAtom(activeChatProxyProfileIdAtom)
  const [selectedModel, setSelectedModel] = useAtom(activeChatSelectedModelAtom)

  const trpcUtils = trpc.useUtils()

  // Track state for saving when switching chats
  const isRestoringRef = useRef(false)
  const lastSubChatIdRef = useRef<string | null>(null)
  const pendingSaveRef = useRef<{
    subChatId: string
    profileType: ProfileType
    proxyProfileId: string | null
    selectedModel: string | null
  } | null>(null)

  // Fetch sub-chat data to restore profile selection
  // Use staleTime: 0 to always get fresh data when switching chats
  const { data: subChat, refetch } = trpc.chats.getSubChat.useQuery(
    { id: subChatId! },
    {
      enabled: !!subChatId,
      staleTime: 0,
    }
  )

  // Save current state to database
  const saveCurrentState = async (
    id: string,
    type: ProfileType,
    profileId: string | null,
    model: string | null
  ) => {
    try {
      await trpcClient.chats.updateSubChatProfile.mutate({
        id,
        profileType: type,
        proxyProfileId: profileId,
        selectedModel: model,
      })
      // Invalidate the query cache so next fetch gets fresh data
      trpcUtils.chats.getSubChat.invalidate({ id })
    } catch (err) {
      console.error("[ProfilePersistence] Failed to save:", err)
    }
  }

  // Save previous chat's state when switching to a new chat
  useEffect(() => {
    const prevSubChatId = lastSubChatIdRef.current

    // If switching from one chat to another, save the previous chat's state first
    if (prevSubChatId && prevSubChatId !== subChatId && !isRestoringRef.current) {
      // Save synchronously before switching
      saveCurrentState(prevSubChatId, profileType, proxyProfileId, selectedModel)
    }

    lastSubChatIdRef.current = subChatId

    // Mark that we need to restore for the new chat
    if (subChatId) {
      pendingSaveRef.current = null
    }
  }, [subChatId, profileType, proxyProfileId, selectedModel])

  // Restore profile selection when switching sub-chats
  useEffect(() => {
    if (!subChatId || !subChat) return

    isRestoringRef.current = true

    // Restore from database
    const dbProfileType = (subChat.profileType as ProfileType) || "oauth"
    const dbProxyProfileId = subChat.proxyProfileId || null
    const dbSelectedModel = subChat.selectedModel || null

    setProfileType(dbProfileType)
    setProxyProfileId(dbProxyProfileId)
    setSelectedModel(dbSelectedModel)

    // Allow saves after a short delay
    setTimeout(() => {
      isRestoringRef.current = false
    }, 150)
  }, [subChatId, subChat, setProfileType, setProxyProfileId, setSelectedModel])

  // Save profile selection when it changes (debounced)
  useEffect(() => {
    if (!subChatId || isRestoringRef.current) return

    // Debounce saves
    const timer = setTimeout(() => {
      saveCurrentState(subChatId, profileType, proxyProfileId, selectedModel)
    }, 500)

    return () => clearTimeout(timer)
  }, [subChatId, profileType, proxyProfileId, selectedModel])

  return { profileType, proxyProfileId, selectedModel }
}

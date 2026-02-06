import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

/**
 * Onboarding completion flag for proxy profile setup
 */
export const proxyProfileOnboardingCompletedAtom = atomWithStorage<boolean>(
  "proxy-profile-onboarding-completed",
  false,
)

/**
 * Currently selected profile ID for active chat (runtime only)
 * Actual persistence is in sub_chats table
 */
export const activeChatProxyProfileIdAtom = atom<string | null>(null)

/**
 * Currently selected model for active chat (runtime only)
 * Actual persistence is in sub_chats table
 */
export const activeChatSelectedModelAtom = atom<string | null>(null)

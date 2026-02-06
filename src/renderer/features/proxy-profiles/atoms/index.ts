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
 * Profile type for the active chat
 * - "oauth": Use Anthropic OAuth account
 * - "override": Use Override Model settings
 * - "proxy": Use a Proxy Profile
 */
export type ProfileType = "oauth" | "override" | "proxy"

/**
 * Currently selected profile type for active chat (runtime only)
 */
export const activeChatProfileTypeAtom = atom<ProfileType>("oauth")

/**
 * Currently selected proxy profile ID for active chat (runtime only)
 * Only used when profileType is "proxy"
 */
export const activeChatProxyProfileIdAtom = atom<string | null>(null)

/**
 * Currently selected model for active chat (runtime only)
 * Used for proxy profiles to select which model from the profile
 */
export const activeChatSelectedModelAtom = atom<string | null>(null)

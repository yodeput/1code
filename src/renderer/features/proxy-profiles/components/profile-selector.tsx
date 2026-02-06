import { ChevronDown } from "lucide-react"
import { useAtom, useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Button } from "../../../components/ui/button"
import { useProxyProfiles, useDefaultProxyProfile } from "../hooks/use-proxy-profiles"
import {
  activeChatProfileTypeAtom,
  activeChatProxyProfileIdAtom,
  activeChatSelectedModelAtom,
  type ProfileType,
} from "../atoms"
import { trpc } from "../../../lib/trpc"
import { customClaudeConfigAtom } from "../../../lib/atoms"
import { useAtomValue } from "jotai"

// Helper to check if override config is set
function hasOverrideConfig(config: { model: string; token: string; baseUrl: string }) {
  return Boolean(config.model?.trim() && config.token?.trim() && config.baseUrl?.trim())
}

interface ProfileSelectorProps {
  disabled?: boolean
}

export function ProfileSelector({ disabled = false }: ProfileSelectorProps) {
  const { data: profiles } = useProxyProfiles()
  const { data: defaultProfile } = useDefaultProxyProfile()
  const { data: anthropicAccounts } = trpc.anthropicAccounts.list.useQuery()
  const customClaudeConfig = useAtomValue(customClaudeConfigAtom)

  const [profileType, setProfileType] = useAtom(activeChatProfileTypeAtom)
  const [selectedProfileId, setSelectedProfileId] = useAtom(activeChatProxyProfileIdAtom)
  const setSelectedModel = useSetAtom(activeChatSelectedModelAtom)

  // Track if we've initialized the default profile
  const initializedRef = useRef(false)

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId)
  const hasAnthropicAccount = (anthropicAccounts?.length ?? 0) > 0
  const hasProfiles = (profiles?.length ?? 0) > 0
  const hasOverride = hasOverrideConfig(customClaudeConfig)

  // Auto-select default proxy profile on first load (for new chats)
  useEffect(() => {
    // Don't initialize if user already has a selection (not oauth, or has a selected profile)
    if (selectedProfileId || profileType !== "oauth") {
      initializedRef.current = true
      return
    }

    // If no default profile exists, mark as initialized to stop retries
    if (!defaultProfile) {
      initializedRef.current = true
      return
    }

    // Default profile exists and no selection - auto-select it
    setProfileType("proxy")
    setSelectedProfileId(defaultProfile.id)
    setSelectedModel(defaultProfile.models?.[0] ?? null)
    initializedRef.current = true
  }, [profileType, defaultProfile, selectedProfileId, setProfileType, setSelectedProfileId, setSelectedModel])

  // Count available options
  const optionCount = (hasAnthropicAccount ? 1 : 0) + (hasOverride ? 1 : 0) + (profiles?.length ?? 0)

  // Don't show selector if no options available
  if (optionCount === 0) {
    return null
  }

  // Get display name based on current selection
  const getDisplayName = () => {
    if (profileType === "oauth") {
      return "Anthropic"
    }
    if (profileType === "override") {
      return "Override"
    }
    if (profileType === "proxy" && selectedProfile) {
      return selectedProfile.name
    }
    return "Select Profile"
  }

  const handleSelectOAuth = () => {
    setProfileType("oauth")
    setSelectedProfileId(null)
    setSelectedModel(null)
  }

  const handleSelectOverride = () => {
    setProfileType("override")
    setSelectedProfileId(null)
    setSelectedModel(null)
  }

  const handleSelectProxy = (profile: { id: string; models: string[] }) => {
    setProfileType("proxy")
    setSelectedProfileId(profile.id)
    setSelectedModel(profile.models?.[0] ?? null)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-normal"
          disabled={disabled}
        >
          {getDisplayName()}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {hasAnthropicAccount && (
          <DropdownMenuItem onClick={handleSelectOAuth}>
            Anthropic (OAuth)
          </DropdownMenuItem>
        )}
        {hasOverride && (
          <DropdownMenuItem onClick={handleSelectOverride}>
            Override Model
          </DropdownMenuItem>
        )}
        {profiles?.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleSelectProxy(profile)}
          >
            {profile.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

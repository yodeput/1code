import { ChevronDown } from "lucide-react"
import { useAtom, useSetAtom } from "jotai"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Button } from "../../../components/ui/button"
import { useProxyProfiles } from "../hooks/use-proxy-profiles"
import { activeChatProxyProfileIdAtom, activeChatSelectedModelAtom } from "../atoms"
import { trpc } from "../../../lib/trpc"

export function ProfileSelector() {
  const { data: profiles } = useProxyProfiles()
  const { data: anthropicAccounts } = trpc.anthropicAccounts.list.useQuery()
  const [selectedProfileId, setSelectedProfileId] = useAtom(
    activeChatProxyProfileIdAtom,
  )
  const setSelectedModel = useSetAtom(activeChatSelectedModelAtom)

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId)
  const hasAnthropicAccount = (anthropicAccounts?.length ?? 0) > 0
  const hasProfiles = (profiles?.length ?? 0) > 0

  // Don't show selector if no profiles and no Anthropic account
  if (!hasProfiles && !hasAnthropicAccount) {
    return null
  }

  // Always show when there are proxy profiles (user needs to see selected profile)
  // Only hide if just Anthropic OAuth and nothing else
  const totalOptions = (hasAnthropicAccount ? 1 : 0) + (profiles?.length ?? 0)
  if (totalOptions <= 1 && !hasProfiles) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-normal"
        >
          {selectedProfile?.name ?? "Anthropic"}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {hasAnthropicAccount && (
          <DropdownMenuItem onClick={() => {
            setSelectedProfileId(null)
            setSelectedModel(null)
          }}>
            Anthropic (OAuth)
          </DropdownMenuItem>
        )}
        {profiles?.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => {
              setSelectedProfileId(profile.id)
              // Reset model to first model of the new profile
              setSelectedModel(profile.models?.[0] ?? null)
            }}
          >
            {profile.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

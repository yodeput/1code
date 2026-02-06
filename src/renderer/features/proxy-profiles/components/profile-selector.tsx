import { ChevronDown } from "lucide-react"
import { useAtom } from "jotai"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Button } from "../../../components/ui/button"
import { useProxyProfiles } from "../hooks/use-proxy-profiles"
import { activeChatProxyProfileIdAtom } from "../atoms"

export function ProfileSelector() {
  const { data: profiles } = useProxyProfiles()
  const [selectedProfileId, setSelectedProfileId] = useAtom(
    activeChatProxyProfileIdAtom,
  )

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId)

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
        <DropdownMenuItem onClick={() => setSelectedProfileId(null)}>
          Anthropic (OAuth)
        </DropdownMenuItem>
        {profiles?.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => setSelectedProfileId(profile.id)}
          >
            {profile.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

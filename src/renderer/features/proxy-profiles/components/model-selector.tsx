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
import {
  activeChatProxyProfileIdAtom,
  activeChatSelectedModelAtom,
} from "../atoms"

export function ModelSelector() {
  const { data: profiles } = useProxyProfiles()
  const [selectedProfileId] = useAtom(activeChatProxyProfileIdAtom)
  const [selectedModel, setSelectedModel] = useAtom(activeChatSelectedModelAtom)

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId)

  // If no profile selected (using OAuth), don't show model selector
  if (!selectedProfile) {
    return null
  }

  const currentModel = selectedModel ?? selectedProfile.models[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-normal"
        >
          {currentModel}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {selectedProfile.models.map((model) => (
          <DropdownMenuItem key={model} onClick={() => setSelectedModel(model)}>
            {model}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

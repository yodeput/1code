import { ChevronDown } from "lucide-react"
import { useAtom, useAtomValue } from "jotai"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Button } from "../../../components/ui/button"
import { useProxyProfiles } from "../hooks/use-proxy-profiles"
import {
  activeChatProfileTypeAtom,
  activeChatProxyProfileIdAtom,
  activeChatSelectedModelAtom,
} from "../atoms"

interface ModelSelectorProps {
  disabled?: boolean
}

export function ModelSelector({ disabled = false }: ModelSelectorProps) {
  const { data: profiles } = useProxyProfiles()
  const profileType = useAtomValue(activeChatProfileTypeAtom)
  const [selectedProfileId] = useAtom(activeChatProxyProfileIdAtom)
  const [selectedModel, setSelectedModel] = useAtom(activeChatSelectedModelAtom)

  // If using Override, show static "Custom Model" text (no dropdown)
  if (profileType === "override") {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs font-normal cursor-default hover:bg-transparent"
        disabled
      >
        Custom Model
      </Button>
    )
  }

  // If using OAuth or no proxy profile selected, don't show model selector
  if (profileType !== "proxy" || !selectedProfileId) {
    return null
  }

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId)

  // If profile not found, don't show
  if (!selectedProfile) {
    return null
  }

  const currentModel = selectedModel ?? selectedProfile.models[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-normal"
          disabled={disabled}
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

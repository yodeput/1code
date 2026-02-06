import { Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "../../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Checkbox } from "../../../components/ui/checkbox"
import {
  useCreateProxyProfile,
  useUpdateProxyProfile,
} from "../hooks/use-proxy-profiles"

interface ProxyProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile?: {
    id: string
    name: string
    baseUrl: string
    models: string[]
    isDefault: boolean
  } | null
}

export function ProxyProfileDialog({
  open,
  onOpenChange,
  profile,
}: ProxyProfileDialogProps) {
  const isEditing = !!profile

  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [models, setModels] = useState<string[]>([""])
  const [isDefault, setIsDefault] = useState(false)

  const createMutation = useCreateProxyProfile()
  const updateMutation = useUpdateProxyProfile()

  // Reset form when dialog opens/closes or profile changes
  useEffect(() => {
    if (open) {
      setName(profile?.name ?? "")
      setBaseUrl(profile?.baseUrl ?? "")
      setApiKey("")
      setModels(profile?.models?.length ? [...profile.models] : [""])
      setIsDefault(profile?.isDefault ?? false)
    }
  }, [open, profile])

  const handleAddModel = () => {
    setModels([...models, ""])
  }

  const handleRemoveModel = (index: number) => {
    if (models.length === 1) {
      toast.error("At least one model is required")
      return
    }
    setModels(models.filter((_, i) => i !== index))
  }

  const handleModelChange = (index: number, value: string) => {
    const newModels = [...models]
    newModels[index] = value
    setModels(newModels)
  }

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Profile name is required")
      return
    }
    if (!baseUrl.trim()) {
      toast.error("Base URL is required")
      return
    }
    if (!isEditing && !apiKey.trim()) {
      toast.error("API key is required")
      return
    }

    const trimmedModels = models.map((m) => m.trim()).filter(Boolean)
    if (trimmedModels.length === 0) {
      toast.error("At least one model is required")
      return
    }

    try {
      if (isEditing && profile) {
        await updateMutation.mutateAsync({
          id: profile.id,
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim() || undefined,
          models: trimmedModels,
        })
        toast.success("Profile updated")
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          models: trimmedModels,
          isDefault,
        })
        toast.success("Profile created")
      }
      onOpenChange(false)
    } catch {
      toast.error(
        isEditing ? "Failed to update profile" : "Failed to create profile",
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Proxy Profile" : "Add Proxy Profile"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="GLM"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.example.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key {isEditing && "(leave blank to keep current)"}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Models</Label>
            <div className="space-y-2">
              {models.map((model, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="model-name"
                    value={model}
                    onChange={(e) => handleModelChange(index, e.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveModel(index)}
                    disabled={models.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddModel}
                className="w-full"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add model
              </Button>
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <label
                htmlFor="isDefault"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Set as default for new projects
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

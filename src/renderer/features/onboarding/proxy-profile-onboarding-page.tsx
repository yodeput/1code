"use client"

import { useSetAtom } from "jotai"
import { useState } from "react"
import { ChevronLeft, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { IconSpinner, SettingsFilledIcon } from "../../components/ui/icons"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Logo } from "../../components/ui/logo"
import { Button } from "../../components/ui/button"
import { billingMethodAtom, apiKeyOnboardingCompletedAtom } from "../../lib/atoms"
import { trpc } from "../../lib/trpc"
import { proxyProfileOnboardingCompletedAtom } from "../proxy-profiles/atoms"
import { cn } from "../../lib/utils"

export function ProxyProfileOnboardingPage() {
  const setBillingMethod = useSetAtom(billingMethodAtom)
  const setOnboardingCompleted = useSetAtom(proxyProfileOnboardingCompletedAtom)
  const setApiKeyOnboardingCompleted = useSetAtom(apiKeyOnboardingCompletedAtom)

  const [name, setName] = useState("Default")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [models, setModels] = useState<string[]>([""])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMutation = trpc.proxyProfiles.create.useMutation()

  const handleBack = () => {
    setBillingMethod(null)
  }

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

  const handleContinue = async () => {
    if (!name.trim()) {
      toast.error("Profile name is required")
      return
    }
    if (!baseUrl.trim()) {
      toast.error("Base URL is required")
      return
    }
    if (!apiKey.trim()) {
      toast.error("API key is required")
      return
    }

    const trimmedModels = models.map((m) => m.trim()).filter(Boolean)
    if (trimmedModels.length === 0) {
      toast.error("At least one model is required")
      return
    }

    setIsSubmitting(true)

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        models: trimmedModels,
        isDefault: true,
      })
      setOnboardingCompleted(true)
      setApiKeyOnboardingCompleted(true)
      // Change billing method to api-key to indicate completion and move to next step
      setBillingMethod("api-key")
      toast.success("Proxy profile configured")
    } catch {
      toast.error("Failed to create profile")
      setIsSubmitting(false)
    }
  }

  const canSubmit = Boolean(
    name.trim() &&
      baseUrl.trim() &&
      apiKey.trim() &&
      models.some((m) => m.trim()),
  )

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none overflow-y-auto">
      {/* Draggable title bar area */}
      <div
        className="fixed top-0 left-0 right-0 h-10"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Back button - fixed in top left corner below traffic lights */}
      <button
        onClick={handleBack}
        className="fixed top-12 left-4 flex items-center justify-center h-8 w-8 rounded-full hover:bg-foreground/5 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="w-full max-w-[440px] space-y-6 px-4 py-16">
        {/* Header with dual icons */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 p-2 mx-auto w-max rounded-full border border-border">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Logo className="w-5 h-5" fill="white" />
            </div>
            <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
              <SettingsFilledIcon className="w-5 h-5 text-background" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight">
              Set Up Proxy Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Connect to any OpenAI-compatible API endpoint
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Profile Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Profile Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Provider"
              className="w-full"
            />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">API endpoint URL</p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full"
            />
          </div>

          {/* Models */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Models</Label>
            <div className="space-y-2">
              {models.map((model, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="model-name"
                    value={model}
                    onChange={(e) => handleModelChange(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveModel(index)}
                    disabled={models.length === 1}
                    className="h-9 w-9 flex-shrink-0"
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
            <p className="text-xs text-muted-foreground">
              Add the models available from this provider
            </p>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!canSubmit || isSubmitting}
          className={cn(
            "w-full h-9 px-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.14)] dark:shadow-[0_0_0_0.5px_rgb(23,23,23),inset_0_0_0_1px_rgba(255,255,255,0.14)] flex items-center justify-center",
            (!canSubmit || isSubmitting) && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting ? <IconSpinner className="h-4 w-4" /> : "Continue"}
        </button>
      </div>
    </div>
  )
}

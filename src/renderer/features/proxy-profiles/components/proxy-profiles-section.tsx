import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "../../../components/ui/button"
import {
  useProxyProfiles,
  useDeleteProxyProfile,
  useSetDefaultProfile,
} from "../hooks/use-proxy-profiles"
import { ProxyProfileCard } from "./proxy-profile-card"
import { ProxyProfileDialog } from "./proxy-profile-dialog"

type ProfileData = {
  id: string
  name: string
  baseUrl: string
  models: string[]
  isDefault: boolean
}

export function ProxyProfilesSection() {
  const { data: profiles, isLoading } = useProxyProfiles()
  const deleteMutation = useDeleteProxyProfile()
  const setDefaultMutation = useSetDefaultProfile()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileData | null>(null)

  const handleEdit = (profile: ProfileData) => {
    setEditingProfile(profile)
    setDialogOpen(true)
  }

  const handleDelete = async (profileId: string, profileName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${profileName}"? This action cannot be undone.`,
    )
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync({ id: profileId })
        toast.success("Profile deleted")
      } catch {
        toast.error("Failed to delete profile")
      }
    }
  }

  const handleSetDefault = async (profileId: string) => {
    try {
      await setDefaultMutation.mutateAsync({ id: profileId })
      toast.success("Default profile updated")
    } catch {
      toast.error("Failed to set default profile")
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingProfile(null)
    }
    setDialogOpen(open)
  }

  const handleAddNew = () => {
    setEditingProfile(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-2">
      <div className="pb-2 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">Proxy Profiles</h4>
          <p className="text-xs text-muted-foreground">
            Manage custom model provider configurations
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleAddNew}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      <div className="bg-background rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading profiles...
          </div>
        ) : !profiles || profiles.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No proxy profiles yet. Click "Add" to create one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {profiles.map((profile) => (
              <ProxyProfileCard
                key={profile.id}
                profile={profile}
                onEdit={() => handleEdit(profile)}
                onDelete={() => handleDelete(profile.id, profile.name)}
                onSetDefault={() => handleSetDefault(profile.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ProxyProfileDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        profile={editingProfile}
      />
    </div>
  )
}

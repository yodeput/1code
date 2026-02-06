import { MoreHorizontal } from "lucide-react"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"

interface ProxyProfileCardProps {
  profile: {
    id: string
    name: string
    baseUrl: string
    models: string[]
    isDefault: boolean
  }
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}

export function ProxyProfileCard({
  profile,
  onEdit,
  onDelete,
  onSetDefault,
}: ProxyProfileCardProps) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{profile.name}</div>
          {profile.isDefault && (
            <Badge variant="secondary" className="text-xs">
              Default
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">
          {profile.baseUrl}
        </div>
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {profile.models.join(" · ")}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!profile.isDefault && (
            <DropdownMenuItem onClick={onSetDefault}>
              Set as Default
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            className="data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-400"
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

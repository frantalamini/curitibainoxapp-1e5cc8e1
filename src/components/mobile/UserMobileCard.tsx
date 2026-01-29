import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserWithRole } from "@/hooks/useUsers";
import { PROFILE_LABELS, ProfileType } from "@/hooks/useUserPermissions";
import { Pencil, Trash2, Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface UserMobileCardProps {
  user: UserWithRole;
  currentUserId: string | null;
  onEdit: (user: UserWithRole) => void;
  onDelete: (userId: string, userName: string) => void;
}

const getProfileBadge = (profileType: ProfileType | null | undefined) => {
  if (!profileType) {
    return <Badge variant="outline" className="text-muted-foreground text-xs">Não configurado</Badge>;
  }
  
  switch (profileType) {
    case "gerencial":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
          <ShieldCheck className="h-3 w-3 mr-1" />
          {PROFILE_LABELS.gerencial}
        </Badge>
      );
    case "adm":
      return (
        <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {PROFILE_LABELS.adm}
        </Badge>
      );
    case "tecnico":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
          <ShieldAlert className="h-3 w-3 mr-1" />
          {PROFILE_LABELS.tecnico}
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">-</Badge>;
  }
};

export function UserMobileCard({
  user,
  currentUserId,
  onEdit,
  onDelete,
}: UserMobileCardProps) {
  return (
    <Card className="w-full max-w-full min-w-0">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{user.full_name}</p>
              {user.username && (
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  @{user.username}
                </code>
              )}
            </div>
          </div>
          {getProfileBadge(user.profile_type)}
        </div>

        {/* Info */}
        <div className="space-y-1 text-sm text-muted-foreground">
          {user.phone && <p>📞 {user.phone}</p>}
          {user.email && <p className="truncate">📧 {user.email}</p>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-0"
            onClick={() => onEdit(user)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 min-w-0"
            onClick={() => onDelete(user.user_id, user.full_name)}
            disabled={user.user_id === currentUserId}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Deletar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

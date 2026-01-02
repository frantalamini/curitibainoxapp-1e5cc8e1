import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppRole, UserWithRole } from "@/hooks/useUsers";
import { Pencil, Trash2, UserPlus, Shield } from "lucide-react";

interface UserMobileCardProps {
  user: UserWithRole;
  currentUserId: string | null;
  onEdit: (user: UserWithRole) => void;
  onAddRole: (userId: string) => void;
  onRemoveRole: (userId: string, role: AppRole) => void;
  onDelete: (userId: string, userName: string) => void;
}

const getRoleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case "admin":
      return "destructive";
    case "technician":
      return "default";
    default:
      return "secondary";
  }
};

const getRoleLabel = (role: AppRole) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "technician":
      return "Técnico";
    default:
      return "Usuário";
  }
};

export function UserMobileCard({
  user,
  currentUserId,
  onEdit,
  onAddRole,
  onRemoveRole,
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
        </div>

        {/* Info */}
        <div className="space-y-1 text-sm text-muted-foreground">
          {user.phone && <p>📞 {user.phone}</p>}
          {user.email && <p className="truncate">📧 {user.email}</p>}
        </div>

        {/* Roles */}
        <div className="flex flex-wrap gap-1.5">
          {user.roles.length === 0 ? (
            <Badge variant="secondary">Sem role</Badge>
          ) : (
            user.roles.map((role) => (
              <Badge
                key={role}
                variant={getRoleBadgeVariant(role)}
                className="gap-1"
              >
                {getRoleLabel(role)}
                <button
                  onClick={() => onRemoveRole(user.user_id, role)}
                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
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
            variant="outline"
            className="flex-1 min-w-0"
            onClick={() => onAddRole(user.user_id)}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Role
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

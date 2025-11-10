import { useState } from "react";
import { useAllUsers, useAddUserRole, useRemoveUserRole, AppRole } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Trash2, Shield, Search } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function UserManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { data: users, isLoading } = useAllUsers();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();

  const [searchTerm, setSearchTerm] = useState("");
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("technician");
  const [removeRoleDialog, setRemoveRoleDialog] = useState<{
    open: boolean;
    userId: string | null;
    role: AppRole | null;
  }>({ open: false, userId: null, role: null });

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredUsers = users?.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRole = () => {
    if (selectedUser && selectedRole) {
      addRole.mutate(
        { userId: selectedUser, role: selectedRole },
        {
          onSuccess: () => {
            setAddRoleDialogOpen(false);
            setSelectedUser(null);
            setSelectedRole("technician");
          },
        }
      );
    }
  };

  const handleRemoveRole = () => {
    if (removeRoleDialog.userId && removeRoleDialog.role) {
      removeRole.mutate(
        { userId: removeRoleDialog.userId, role: removeRoleDialog.role },
        {
          onSuccess: () => {
            setRemoveRoleDialog({ open: false, userId: null, role: null });
          },
        }
      );
    }
  };

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Gerencie roles e permissões dos usuários do sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando usuários...
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
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
                                  onClick={() =>
                                    setRemoveRoleDialog({
                                      open: true,
                                      userId: user.user_id,
                                      role,
                                    })
                                  }
                                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user.user_id);
                            setAddRoleDialogOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Adicionar Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Role ao Usuário</DialogTitle>
            <DialogDescription>
              Selecione a role que deseja atribuir ao usuário selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="technician">Técnico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRole} disabled={addRole.isPending}>
              {addRole.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeRoleDialog.open}
        onOpenChange={(open) =>
          !open && setRemoveRoleDialog({ open: false, userId: null, role: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Role</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a role "{removeRoleDialog.role && getRoleLabel(removeRoleDialog.role)}" deste usuário? Esta ação pode afetar as permissões de acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

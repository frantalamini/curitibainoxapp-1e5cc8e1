import { useState } from "react";
import { useAllUsers, useAddUserRole, useRemoveUserRole, useCreateUser, useDeleteUser, AppRole, UserWithRole } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditUserDialog } from "@/components/EditUserDialog";
import { UserMobileCard } from "@/components/mobile/UserMobileCard";
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
import { UserPlus, Trash2, Shield, Search, Plus, Pencil } from "lucide-react";
import { Navigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export default function UserManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { data: users, isLoading } = useAllUsers();
  const isMobile = useIsMobile();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("technician");
  const [removeRoleDialog, setRemoveRoleDialog] = useState<{
    open: boolean;
    userId: string | null;
    role: AppRole | null;
  }>({ open: false, userId: null, role: null });

  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    open: boolean;
    userId: string | null;
    userName: string | null;
  }>({ open: false, userId: null, userName: null });

  // Form state for creating new user
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "technician" as AppRole,
  });

  // Pegar o user_id do usuário atual
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  });

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
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleCreateUser = () => {
    if (!newUserForm.username || !newUserForm.email || !newUserForm.password || !newUserForm.full_name) {
      return;
    }

    createUser.mutate(newUserForm, {
      onSuccess: () => {
        setCreateUserDialogOpen(false);
        setNewUserForm({
          username: "",
          email: "",
          password: "",
          full_name: "",
          phone: "",
          role: "technician",
        });
      },
    });
  };

  const handleDeleteUser = () => {
    if (deleteUserDialog.userId) {
      deleteUser.mutate(deleteUserDialog.userId, {
        onSuccess: () => {
          setDeleteUserDialog({ open: false, userId: null, userName: null });
        },
      });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card className="w-full max-w-full min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="truncate">Gerenciamento de Usuários</CardTitle>
                  <CardDescription className="hidden sm:block">
                    Gerencie roles e permissões dos usuários do sistema
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => setCreateUserDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Criar Usuário
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando usuários...
              </div>
            ) : isMobile ? (
              // Mobile: Cards
              <div className="space-y-3">
                {filteredUsers?.map((user) => (
                  <UserMobileCard
                    key={user.id}
                    user={user}
                    currentUserId={currentUserId}
                    onEdit={(u) => {
                      setSelectedUserForEdit(u);
                      setEditUserDialogOpen(true);
                    }}
                    onAddRole={(userId) => {
                      setSelectedUser(userId);
                      setAddRoleDialogOpen(true);
                    }}
                    onRemoveRole={(userId, role) => {
                      setRemoveRoleDialog({ open: true, userId, role });
                    }}
                    onDelete={(userId, userName) => {
                      setDeleteUserDialog({ open: true, userId, userName });
                    }}
                  />
                ))}
                {filteredUsers?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                )}
              </div>
            ) : (
              // Desktop: Table
              <div className="border rounded-lg w-full max-w-full min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[28%]">Nome</TableHead>
                      <TableHead className="w-[15%]">Username</TableHead>
                      <TableHead className="w-[12%]">Telefone</TableHead>
                      <TableHead className="w-[20%]">Roles</TableHead>
                      <TableHead className="w-[25%] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-sm">
                          <span className="cell-multiline" title={user.full_name}>{user.full_name}</span>
                        </TableCell>
                        <TableCell>
                          {user.username ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded cell-truncate block">@{user.username}</code>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm cell-truncate">{user.phone || "-"}</TableCell>
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
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSelectedUserForEdit(user);
                                setEditUserDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSelectedUser(user.user_id);
                                setAddRoleDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Role
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setDeleteUserDialog({ 
                                  open: true, 
                                  userId: user.user_id, 
                                  userName: user.full_name 
                                });
                              }}
                              disabled={user.user_id === currentUserId}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Deletar
                            </Button>
                          </div>
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

        <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário no sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  placeholder="Digite o nome completo"
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Nome de Usuário *</Label>
                <Input
                  id="username"
                  placeholder="usuario123"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase() })}
                />
                <p className="text-xs text-muted-foreground">
                  Apenas letras, números, ponto e underscore
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                />
                {newUserForm.password && (
                  <PasswordStrengthIndicator password={newUserForm.password} className="mt-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Perfil Inicial *</Label>
                <Select 
                  value={newUserForm.role} 
                  onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value as AppRole })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="technician">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCreateUserDialogOpen(false);
                  setNewUserForm({
                    username: "",
                    email: "",
                    password: "",
                    full_name: "",
                    phone: "",
                    role: "technician",
                  });
                }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateUser} 
                disabled={
                  createUser.isPending || 
                  !newUserForm.username ||
                  !newUserForm.email || 
                  !newUserForm.password || 
                  !newUserForm.full_name
                }
                className="w-full sm:w-auto"
              >
                {createUser.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <EditUserDialog
          open={editUserDialogOpen}
          onOpenChange={setEditUserDialogOpen}
          user={selectedUserForEdit}
        />

        {/* Delete User Confirmation Dialog */}
        <AlertDialog
          open={deleteUserDialog.open}
          onOpenChange={(open) =>
            !open && setDeleteUserDialog({ open: false, userId: null, userName: null })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar permanentemente o usuário <strong>{deleteUserDialog.userName}</strong>? 
                Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Deletar Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

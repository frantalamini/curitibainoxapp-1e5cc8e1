import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserWithRole } from "@/hooks/useUsers";
import { useUpdateUser, useResetUserPassword } from "@/hooks/useUsers";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const updateUser = useUpdateUser();
  const resetPassword = useResetUserPassword();

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setFullName(user.full_name);
      setPhone(user.phone || "");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validar senha se fornecida
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast({ 
          title: "Erro", 
          description: "As senhas não coincidem", 
          variant: "destructive" 
        });
        return;
      }
      
      // Resetar senha
      await resetPassword.mutateAsync({ 
        userId: user.user_id, 
        newPassword 
      });
    }

    // Atualizar perfil
    await updateUser.mutateAsync({
      userId: user.user_id,
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
    });

    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">Nome de Usuário</Label>
            <Input
              id="edit-username"
              value={username}
              disabled={true}
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              O nome de usuário não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-full-name">Nome Completo</Label>
            <Input
              id="edit-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telefone</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
            <div className="relative">
              <Input
                id="edit-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixe em branco para manter a senha atual"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {newPassword && <PasswordStrengthIndicator password={newPassword} />}
          </div>

          {newPassword && (
            <div className="space-y-2">
              <Label htmlFor="edit-confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="edit-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            <p className="text-sm font-medium">Email (não editável)</p>
            <p className="text-sm text-muted-foreground">{user.email || "Não disponível"}</p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateUser.isPending || resetPassword.isPending}>
              {(updateUser.isPending || resetPassword.isPending) ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserWithRole } from "@/hooks/useUsers";
import { useUpdateUser } from "@/hooks/useUsers";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const updateUser = useUpdateUser();

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setFullName(user.full_name);
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    await updateUser.mutateAsync({
      userId: user.user_id,
      username: username.trim(),
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
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nome.usuario"
              required
              minLength={3}
              pattern="[a-z0-9._]+"
              title="Apenas letras minúsculas, números, pontos e underscores"
            />
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, números, pontos e underscores
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
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Loader2,
  Plus,
  Pencil,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Settings2,
  ChevronRight,
} from "lucide-react";
import {
  useAccessProfiles,
  useCreateAccessProfile,
  useUpdateAccessProfile,
  type AccessProfile,
} from "@/hooks/useAccessProfiles";

const PROFILE_ICONS: Record<string, React.ReactNode> = {
  Gerencial: <ShieldCheck className="h-5 w-5 text-green-500" />,
  Administrativo: <Shield className="h-5 w-5 text-blue-500" />,
  Técnico: <ShieldAlert className="h-5 w-5 text-amber-500" />,
};

const getProfileIcon = (name: string) =>
  PROFILE_ICONS[name] ?? <ShieldX className="h-5 w-5 text-muted-foreground" />;

// ============================================================
// Dialog: Criar / Editar Perfil
// ============================================================

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: AccessProfile;
}

function ProfileDialog({ open, onOpenChange, profile }: ProfileDialogProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");

  const create = useCreateAccessProfile();
  const update = useUpdateAccessProfile();

  const isPending = create.isPending || update.isPending;
  const isEditing = !!profile;

  const handleSave = async () => {
    if (!name.trim()) return;

    if (isEditing) {
      await update.mutateAsync({
        id: profile!.id,
        name: name.trim(),
        description: description.trim(),
      });
    } else {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Perfil" : "Novo Perfil de Acesso"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Perfil *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supervisor, Técnico Sênior..."
              disabled={isEditing && profile?.is_system}
            />
            {isEditing && profile?.is_system && (
              <p className="text-xs text-muted-foreground">
                Perfis do sistema não podem ter o nome alterado.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as responsabilidades deste perfil..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Criar Perfil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Página principal
// ============================================================

export default function PerfisAcesso() {
  const navigate = useNavigate();
  const { data: profiles, isLoading } = useAccessProfiles();
  const updateProfile = useUpdateAccessProfile();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccessProfile | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AccessProfile | null>(null);

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    await updateProfile.mutateAsync({
      id: toggleTarget.id,
      is_active: !toggleTarget.is_active,
    });
    setToggleTarget(null);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Perfis de Acesso</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie os perfis do sistema. Cada usuário herda as permissões do
              seu perfil.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Button>
        </div>

        {/* Lista de perfis */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {profiles?.map((profile) => (
              <Card
                key={profile.id}
                className={!profile.is_active ? "opacity-60" : ""}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {getProfileIcon(profile.name)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">
                            {profile.name}
                          </CardTitle>
                          {profile.is_system && (
                            <Badge variant="outline" className="text-xs">
                              Sistema
                            </Badge>
                          )}
                          {!profile.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        {profile.description && (
                          <CardDescription className="mt-1">
                            {profile.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/settings/permissoes?perfil=${profile.id}`)
                        }
                      >
                        <Settings2 className="h-4 w-4 mr-1" />
                        Permissões
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditTarget(profile)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {!profile.is_system && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setToggleTarget(profile)}
                          className={
                            profile.is_active
                              ? "text-destructive hover:text-destructive"
                              : ""
                          }
                        >
                          {profile.is_active ? "Inativar" : "Ativar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <ProfileDialog open={createOpen} onOpenChange={setCreateOpen} />

        {editTarget && (
          <ProfileDialog
            open={!!editTarget}
            onOpenChange={(open) => !open && setEditTarget(null)}
            profile={editTarget}
          />
        )}

        <AlertDialog
          open={!!toggleTarget}
          onOpenChange={(open) => !open && setToggleTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {toggleTarget?.is_active ? "Inativar" : "Ativar"} perfil?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {toggleTarget?.is_active
                  ? `Usuários com o perfil "${toggleTarget?.name}" não terão mais acesso ao sistema.`
                  : `O perfil "${toggleTarget?.name}" voltará a estar disponível para atribuição.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleActive}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}

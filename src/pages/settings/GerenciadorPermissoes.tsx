import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAccessProfiles,
  useProfilePermissions,
  useSaveProfilePermissions,
  useSyncMissingModules,
  type ProfilePermissionItem,
} from "@/hooks/useAccessProfiles";
import {
  ALL_MODULES,
  MENU_TREE,
  type SystemModule,
} from "@/hooks/useUserPermissions";

// ============================================================
// Tipos e helpers
// ============================================================

type PermAction = keyof Omit<ProfilePermissionItem, "module">;

const ACTIONS: { key: PermAction; label: string; description: string }[] = [
  {
    key: "can_view",
    label: "Visualizar",
    description: "Vê o item no menu / sabe que a seção existe",
  },
  {
    key: "can_consult",
    label: "Consultar",
    description: "Abre e lê o conteúdo da seção",
  },
  { key: "can_create", label: "Criar", description: "Cria novos registros" },
  {
    key: "can_edit",
    label: "Editar",
    description: "Edita registros existentes",
  },
  { key: "can_delete", label: "Excluir", description: "Exclui registros" },
];

const PROFILE_ICONS: Record<string, React.ReactNode> = {
  Gerencial: <ShieldCheck className="h-4 w-4 text-green-500" />,
  Administrativo: <Shield className="h-4 w-4 text-blue-500" />,
  Técnico: <ShieldAlert className="h-4 w-4 text-amber-500" />,
};
const getIcon = (name: string) =>
  PROFILE_ICONS[name] ?? <ShieldX className="h-4 w-4 text-muted-foreground" />;

type PermState = Record<SystemModule, Omit<ProfilePermissionItem, "module">>;

const buildInitialState = (): PermState => {
  const s = {} as PermState;
  ALL_MODULES.forEach((m) => {
    s[m.key] = {
      can_view: false,
      can_consult: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };
  });
  return s;
};

// ============================================================
// Página
// ============================================================

export default function GerenciadorPermissoes() {
  const [searchParams] = useSearchParams();
  const initialProfileId = searchParams.get("perfil") ?? "";

  const { data: profiles, isLoading: profilesLoading } = useAccessProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState(initialProfileId);
  const syncModules = useSyncMissingModules();

  // Sincronizar módulos ausentes no banco ao abrir a página
  useEffect(() => {
    syncModules.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: permsData, isLoading: permsLoading } = useProfilePermissions(
    selectedProfileId || null,
  );
  const savePerms = useSaveProfilePermissions();

  const [state, setState] = useState<PermState>(buildInitialState());
  const [isDirty, setIsDirty] = useState(false);

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const isGerencial = selectedProfile?.name === "Gerencial";

  // Sincronizar estado com dados carregados
  useEffect(() => {
    if (!permsData) return;

    const next = buildInitialState();
    permsData.forEach((p) => {
      next[p.module] = {
        can_view: p.can_view,
        can_consult: p.can_consult,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      };
    });

    // Gerencial sempre tem tudo true
    if (isGerencial) {
      ALL_MODULES.forEach((m) => {
        next[m.key] = {
          can_view: true,
          can_consult: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
        };
      });
    }

    setState(next);
    setIsDirty(false);
  }, [permsData, isGerencial]);

  // Resetar ao trocar de perfil
  useEffect(() => {
    setState(buildInitialState());
    setIsDirty(false);
  }, [selectedProfileId]);

  const toggle = (module: SystemModule, action: PermAction) => {
    if (isGerencial) return;

    setState((prev) => {
      const cur = { ...prev[module] };
      const newVal = !cur[action];

      // Desmarcar Visualizar desmarca tudo
      if (action === "can_view" && !newVal) {
        return {
          ...prev,
          [module]: {
            can_view: false,
            can_consult: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
          },
        };
      }

      // Consultar requer Visualizar
      if (action === "can_consult" && newVal) {
        cur.can_view = true;
      }
      // Criar/Editar/Excluir requer Visualizar + Consultar
      if (
        (action === "can_create" ||
          action === "can_edit" ||
          action === "can_delete") &&
        newVal
      ) {
        cur.can_view = true;
        cur.can_consult = true;
      }

      cur[action] = newVal;
      return { ...prev, [module]: cur };
    });
    setIsDirty(true);
  };

  const toggleColumn = (action: PermAction) => {
    if (isGerencial) return;

    const allChecked = ALL_MODULES.every((m) => state[m.key][action]);

    setState((prev) => {
      const next = { ...prev };
      ALL_MODULES.forEach((m) => {
        const cur = { ...next[m.key] };
        if (allChecked) {
          cur[action] = false;
        } else {
          cur[action] = true;
          if (action !== "can_view") cur.can_view = true;
          if (action !== "can_view" && action !== "can_consult")
            cur.can_consult = true;
        }
        next[m.key] = cur;
      });
      return next;
    });
    setIsDirty(true);
  };

  const isColumnAll = (action: PermAction) =>
    ALL_MODULES.every((m) => state[m.key][action]);

  const handleSave = async () => {
    if (!selectedProfileId) return;
    const perms: ProfilePermissionItem[] = ALL_MODULES.map((m) => ({
      module: m.key,
      ...state[m.key],
    }));
    await savePerms.mutateAsync({
      profileId: selectedProfileId,
      permissions: perms,
    });
    setIsDirty(false);
  };

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Permissões</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure a matriz de permissões por perfil. As alterações afetam
              todos os usuários com o perfil selecionado.
            </p>
          </div>

          {/* Seletor de perfil */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Perfil de Acesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profilesLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={selectedProfileId}
                    onValueChange={setSelectedProfileId}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selecione um perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            {getIcon(p.name)}
                            <span>{p.name}</span>
                            {p.is_system && (
                              <span className="text-xs text-muted-foreground">
                                (sistema)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedProfile && (
                    <Badge variant={isGerencial ? "default" : "outline"}>
                      {selectedProfile.name}
                    </Badge>
                  )}

                  {isGerencial && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Gerencial tem acesso total — não é possível restringir
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matriz de permissões */}
          {selectedProfileId && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Matriz de Permissões
                  </CardTitle>
                  {isDirty && (
                    <Button onClick={handleSave} disabled={savePerms.isPending}>
                      {savePerms.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {permsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium w-56">
                            Módulo
                          </th>
                          {ACTIONS.map((action) => (
                            <th
                              key={action.key}
                              className="px-3 py-3 text-center font-medium min-w-[100px]"
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex items-center gap-1">
                                  <span>{action.label}</span>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[180px] text-center">
                                      {action.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Button
                                  type="button"
                                  variant={
                                    isColumnAll(action.key)
                                      ? "secondary"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="text-xs h-6 px-2"
                                  onClick={() => toggleColumn(action.key)}
                                  disabled={isGerencial}
                                >
                                  {isColumnAll(action.key)
                                    ? "Desmarcar"
                                    : "Marcar todos"}
                                </Button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {MENU_TREE.map((group) => (
                          <React.Fragment key={group.group}>
                            {/* Cabeçalho do grupo */}
                            <tr className="bg-muted/60">
                              <td
                                colSpan={ACTIONS.length + 1}
                                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t-2 border-muted"
                              >
                                {group.group}
                              </td>
                            </tr>

                            {/* Itens do grupo */}
                            {group.items.map((item) => (
                              <tr key={item.key} className="hover:bg-muted/30">
                                <td
                                  className={`py-2.5 font-medium ${item.sublevel ? "pl-12 pr-4 text-muted-foreground text-xs" : "px-4"}`}
                                >
                                  {item.sublevel && (
                                    <span className="mr-1 text-muted-foreground">
                                      →
                                    </span>
                                  )}
                                  {item.label}
                                </td>
                                {ACTIONS.map((action) => (
                                  <td
                                    key={action.key}
                                    className="px-3 py-2.5 text-center"
                                  >
                                    <Checkbox
                                      checked={
                                        state[item.key]?.[action.key] ?? false
                                      }
                                      onCheckedChange={() =>
                                        toggle(item.key, action.key)
                                      }
                                      disabled={isGerencial}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedProfileId && !profilesLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                Selecione um perfil acima para configurar as permissões.
              </CardContent>
            </Card>
          )}

          {/* Salvar fixo no rodapé */}
          {isDirty && (
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={savePerms.isPending}
                size="lg"
              >
                {savePerms.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}

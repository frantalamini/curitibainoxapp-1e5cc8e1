import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ProfileType, 
  SystemModule, 
  ALL_MODULES, 
  PROFILE_LABELS,
  useUserPermissions,
  useSaveUserPermissions,
} from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface PermissionState {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface UserPermissionsMatrixProps {
  userId: string;
  onSaved?: () => void;
}

export function UserPermissionsMatrix({ userId, onSaved }: UserPermissionsMatrixProps) {
  const { data: existingPermissions, isLoading } = useUserPermissions(userId);
  const savePermissions = useSaveUserPermissions();
  
  const [profileType, setProfileType] = useState<ProfileType>("tecnico");
  const [permissions, setPermissions] = useState<Record<SystemModule, PermissionState>>(() => {
    const initial: Record<SystemModule, PermissionState> = {} as any;
    ALL_MODULES.forEach((m) => {
      initial[m.key] = { can_view: false, can_edit: false, can_delete: false };
    });
    return initial;
  });

  // Carregar permissões existentes
  useEffect(() => {
    if (existingPermissions && existingPermissions.length > 0) {
      setProfileType(existingPermissions[0].profile_type);
      
      const newPerms: Record<SystemModule, PermissionState> = {} as any;
      ALL_MODULES.forEach((m) => {
        const existing = existingPermissions.find((p) => p.module === m.key);
        newPerms[m.key] = existing
          ? { can_view: existing.can_view, can_edit: existing.can_edit, can_delete: existing.can_delete }
          : { can_view: false, can_edit: false, can_delete: false };
      });
      setPermissions(newPerms);
    }
  }, [existingPermissions]);

  const handleProfileChange = (newType: ProfileType) => {
    setProfileType(newType);
    
    // Se for Gerencial, marca tudo como true
    if (newType === "gerencial") {
      const allTrue: Record<SystemModule, PermissionState> = {} as any;
      ALL_MODULES.forEach((m) => {
        allTrue[m.key] = { can_view: true, can_edit: true, can_delete: true };
      });
      setPermissions(allTrue);
    }
  };

  const togglePermission = (module: SystemModule, field: keyof PermissionState) => {
    if (profileType === "gerencial") return; // Gerencial não pode editar
    
    setPermissions((prev) => {
      const current = prev[module];
      const newValue = !current[field];
      
      // Se desmarcar "consultar", desmarca tudo
      if (field === "can_view" && !newValue) {
        return {
          ...prev,
          [module]: { can_view: false, can_edit: false, can_delete: false },
        };
      }
      
      // Se marcar "editar" ou "excluir", marca "consultar" também
      if ((field === "can_edit" || field === "can_delete") && newValue) {
        return {
          ...prev,
          [module]: { ...current, [field]: newValue, can_view: true },
        };
      }
      
      return {
        ...prev,
        [module]: { ...current, [field]: newValue },
      };
    });
  };

  const handleSave = () => {
    const permsArray = ALL_MODULES.map((m) => ({
      module: m.key,
      ...permissions[m.key],
    }));
    
    savePermissions.mutate(
      { userId, profileType, permissions: permsArray },
      { onSuccess: onSaved }
    );
  };

  const getProfileIcon = () => {
    switch (profileType) {
      case "gerencial":
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case "adm":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "tecnico":
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Perfil */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de Perfil</Label>
        <Select value={profileType} onValueChange={(v) => handleProfileChange(v as ProfileType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gerencial">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                Gerencial (Acesso Total)
              </div>
            </SelectItem>
            <SelectItem value="adm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Administrativo (Acesso Restrito)
              </div>
            </SelectItem>
            <SelectItem value="tecnico">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Técnico (Acesso Limitado)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2 mt-2">
          {getProfileIcon()}
          <Badge variant={profileType === "gerencial" ? "default" : profileType === "adm" ? "secondary" : "outline"}>
            {PROFILE_LABELS[profileType]}
          </Badge>
          {profileType === "gerencial" && (
            <span className="text-xs text-muted-foreground">
              Acesso total a todos os módulos
            </span>
          )}
        </div>
      </div>

      {/* Matriz de Permissões */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Módulo</th>
                <th className="px-4 py-3 text-center font-medium w-24">Consultar</th>
                <th className="px-4 py-3 text-center font-medium w-24">Editar</th>
                <th className="px-4 py-3 text-center font-medium w-24">Excluir</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ALL_MODULES.map((mod) => (
                <tr key={mod.key} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{mod.label}</td>
                  <td className="px-4 py-3 text-center">
                    <Checkbox
                      checked={permissions[mod.key]?.can_view ?? false}
                      onCheckedChange={() => togglePermission(mod.key, "can_view")}
                      disabled={profileType === "gerencial"}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Checkbox
                      checked={permissions[mod.key]?.can_edit ?? false}
                      onCheckedChange={() => togglePermission(mod.key, "can_edit")}
                      disabled={profileType === "gerencial"}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Checkbox
                      checked={permissions[mod.key]?.can_delete ?? false}
                      onCheckedChange={() => togglePermission(mod.key, "can_delete")}
                      disabled={profileType === "gerencial"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={savePermissions.isPending}>
          {savePermissions.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Permissões"
          )}
        </Button>
      </div>
    </div>
  );
}

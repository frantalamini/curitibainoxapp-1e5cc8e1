import { useServiceCallStatuses, StatusType } from "@/hooks/useServiceCallStatuses";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentUserPermissions } from "@/hooks/useUserPermissions";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusSelectFieldProps {
  statusType: StatusType;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Campo de seleção de status com controle de permissão integrado.
 * 
 * Regras de permissão:
 * - Status Técnico: Técnicos, ADM e Gerencial podem alterar
 * - Status Comercial: Apenas ADM e Gerencial podem alterar
 * 
 * Se o usuário não tiver permissão, exibe um badge estático (somente leitura).
 */
export function StatusSelectField({
  statusType,
  value,
  onChange,
  disabled = false,
  className,
}: StatusSelectFieldProps) {
  const { statuses, isLoading: statusesLoading } = useServiceCallStatuses();
  const { isAdmin, isTechnician, loading: rolesLoading } = useUserRole();
  const { data: permissionsData, isLoading: permissionsLoading } = useCurrentUserPermissions();

  const isLoading = statusesLoading || rolesLoading || permissionsLoading;

  // Filtrar status ativos do tipo correspondente
  const filteredStatuses = statuses?.filter(
    (s) => s.active && s.status_type === statusType
  ) || [];

  // Status selecionado atualmente
  const selectedStatus = statuses?.find((s) => s.id === value);

  // Verificar permissões
  const profileType = permissionsData?.profileType;
  const isGerencial = profileType === "gerencial";
  const isAdm = profileType === "adm";

  // Lógica de permissão:
  // Status Técnico: Técnicos, ADM e Gerencial podem alterar
  // Status Comercial: Apenas ADM e Gerencial podem alterar
  const canEditTechnicalStatus = isAdmin || isTechnician || isGerencial || isAdm;
  const canEditCommercialStatus = isAdmin || isGerencial || isAdm;

  const canEdit = statusType === "tecnico" 
    ? canEditTechnicalStatus 
    : canEditCommercialStatus;

  // Labels
  const label = statusType === "tecnico" ? "Status Técnico" : "Status Comercial";

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>{label}</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Se não pode editar ou está desabilitado, mostrar badge estático
  if (!canEdit || disabled) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>{label}</Label>
        <div className="h-10 flex items-center">
          {selectedStatus ? (
            <StatusBadge
              color={selectedStatus.color}
              label={selectedStatus.name}
              size="md"
            />
          ) : (
            <span className="text-sm text-muted-foreground">Não definido</span>
          )}
        </div>
      </div>
    );
  }

  // Pode editar - mostrar dropdown
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <Select 
        value={value || "__none__"} 
        onValueChange={(val) => onChange(val === "__none__" ? "" : val)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Selecione o ${label.toLowerCase()}`}>
            {selectedStatus ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: selectedStatus.color }}
                />
                <span className="truncate">{selectedStatus.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Selecione...</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">Nenhum</span>
          </SelectItem>
          {filteredStatuses.map((status) => (
            <SelectItem key={status.id} value={status.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                <span>{status.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Tag, X, Plus, Loader2, CircleDot } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useServiceCallStatuses, StatusType } from "@/hooks/useServiceCallStatuses";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentUserPermissions } from "@/hooks/useUserPermissions";
import type { ServiceCallMarker } from "@/hooks/useServiceCallMarkers";

interface ServiceCallActionsMenuProps {
  serviceCallId: string;
  osNumber: number;
  clientName?: string;
  markers: ServiceCallMarker[];
  onAddMarker: (serviceCallId: string, text: string) => Promise<void>;
  onRemoveMarker: (markerId: string) => Promise<void>;
  isLoading?: boolean;
  currentStatusId?: string;
  currentCommercialStatusId?: string;
}

export function ServiceCallActionsMenu({
  serviceCallId,
  osNumber,
  clientName,
  markers,
  onAddMarker,
  onRemoveMarker,
  isLoading,
  currentStatusId,
  currentCommercialStatusId,
}: ServiceCallActionsMenuProps) {
  const [isMarkersOpen, setIsMarkersOpen] = useState(false);
  const [newMarkerText, setNewMarkerText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { toast } = useToast();
  const { statuses } = useServiceCallStatuses();
  const queryClient = useQueryClient();
  
  // Permissões
  const { isAdmin, isTechnician, loading: roleLoading } = useUserRole();
  const { data: permissionsData, isLoading: permissionsLoading } = useCurrentUserPermissions();
  const profileType = permissionsData?.profileType;
  const isGerencial = profileType === "gerencial";
  const isAdm = profileType === "adm";

  // Enquanto carrega, considerar que PODE ter permissão (evita flickering/sumiço dos menus)
  // Após carregar, usar a lógica real. Se não tiver permissão, RLS bloqueia no backend.
  const isLoadingPermissions = roleLoading || permissionsLoading;

  // Permissões para alteração de status
  const canEditTechnicalStatus = isLoadingPermissions || isAdmin || isTechnician || isGerencial || isAdm;
  const canEditCommercialStatus = isLoadingPermissions || isAdmin || isGerencial || isAdm;

  // Filtrar status por tipo
  const technicalStatuses = statuses?.filter(s => s.active && s.status_type === 'tecnico') || [];
  const commercialStatuses = statuses?.filter(s => s.active && s.status_type === 'comercial') || [];

  const handleAddMarker = async () => {
    if (!newMarkerText.trim()) return;
    
    setIsSaving(true);
    try {
      await onAddMarker(serviceCallId, newMarkerText);
      setNewMarkerText("");
      toast({
        title: "Marcador adicionado",
        description: `Marcador "${newMarkerText}" adicionado à OS #${osNumber}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o marcador",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMarker = async (markerId: string, markerText: string) => {
    try {
      await onRemoveMarker(markerId);
      toast({
        title: "Marcador removido",
        description: `Marcador "${markerText}" removido`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o marcador",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Impede que eventos de teclado "vazem" para a TableRow
    e.stopPropagation();
    
    if (e.key === "Enter" && !isSaving) {
      handleAddMarker();
    }
  };

  const handleStatusChange = async (statusType: 'tecnico' | 'comercial', statusId: string | null) => {
    setIsUpdatingStatus(true);
    try {
      const updateField = statusType === 'tecnico' ? 'status_id' : 'commercial_status_id';
      
      const { error } = await supabase
        .from("service_calls")
        .update({ [updateField]: statusId })
        .eq("id", serviceCallId);

      if (error) throw error;

      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["service-calls"] });
      queryClient.invalidateQueries({ queryKey: ["service-call", serviceCallId] });

      const statusName = statusId 
        ? statuses?.find(s => s.id === statusId)?.name 
        : "Nenhum";
      
      toast({
        title: "Status atualizado",
        description: `${statusType === 'tecnico' ? 'Status Técnico' : 'Status Comercial'} alterado para "${statusName}"`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Não foi possível alterar o status: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {isUpdatingStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MoreHorizontal className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="px-2 py-1.5 text-sm font-medium">
            Nº {osNumber} - {clientName || "Sem cliente"}
          </div>
          <DropdownMenuSeparator />
          
          {/* Status Técnico */}
          {canEditTechnicalStatus && technicalStatuses.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <CircleDot className="mr-2 h-4 w-4" />
                Status Técnico
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[180px] max-h-[50vh] overflow-y-auto" sideOffset={2} alignOffset={-5}>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('tecnico', null)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                    <span className="text-muted-foreground">Nenhum</span>
                    {!currentStatusId && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {technicalStatuses.map((status) => (
                  <DropdownMenuItem
                    key={status.id}
                    onClick={() => handleStatusChange('tecnico', status.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <span>{status.name}</span>
                      {currentStatusId === status.id && (
                        <span className="ml-auto text-xs">✓</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {/* Status Comercial */}
          {canEditCommercialStatus && commercialStatuses.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <CircleDot className="mr-2 h-4 w-4" />
                Status Comercial
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[180px] max-h-[50vh] overflow-y-auto" sideOffset={2} alignOffset={-5}>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('comercial', null)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                    <span className="text-muted-foreground">Nenhum</span>
                    {!currentCommercialStatusId && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {commercialStatuses.map((status) => (
                  <DropdownMenuItem
                    key={status.id}
                    onClick={() => handleStatusChange('comercial', status.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <span>{status.name}</span>
                      {currentCommercialStatusId === status.id && (
                        <span className="ml-auto text-xs">✓</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {(canEditTechnicalStatus || canEditCommercialStatus) && <DropdownMenuSeparator />}

          <DropdownMenuItem
            onClick={() => setIsMarkersOpen(true)}
            className="cursor-pointer"
          >
            <Tag className="mr-2 h-4 w-4" />
            Marcadores
            {markers.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                ({markers.length})
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isMarkersOpen} onOpenChange={setIsMarkersOpen}>
        <DialogContent 
          className="sm:max-w-md" 
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Marcadores - OS #{osNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Adicionar novo marcador */}
            <div className="flex gap-2">
              <Input
                placeholder="Digite um lembrete..."
                value={newMarkerText}
                onChange={(e) => setNewMarkerText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleAddMarker}
                disabled={!newMarkerText.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Lista de marcadores */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                </div>
              ) : markers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum marcador adicionado
                </p>
              ) : (
                markers.map((marker) => (
                  <div
                    key={marker.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group"
                  >
                    <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1">{marker.text}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveMarker(marker.id, marker.text)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

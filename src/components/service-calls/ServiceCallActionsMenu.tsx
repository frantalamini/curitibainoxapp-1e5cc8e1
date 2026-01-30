import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Tag, X, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { ServiceCallMarker } from "@/hooks/useServiceCallMarkers";

interface ServiceCallActionsMenuProps {
  serviceCallId: string;
  osNumber: number;
  clientName?: string;
  markers: ServiceCallMarker[];
  onAddMarker: (serviceCallId: string, text: string) => Promise<void>;
  onRemoveMarker: (markerId: string) => Promise<void>;
  isLoading?: boolean;
}

export function ServiceCallActionsMenu({
  serviceCallId,
  osNumber,
  clientName,
  markers,
  onAddMarker,
  onRemoveMarker,
  isLoading,
}: ServiceCallActionsMenuProps) {
  const [isMarkersOpen, setIsMarkersOpen] = useState(false);
  const [newMarkerText, setNewMarkerText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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
    if (e.key === "Enter" && !isSaving) {
      handleAddMarker();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <div className="px-2 py-1.5 text-sm font-medium">
            Nº {osNumber} - {clientName || "Sem cliente"}
          </div>
          <DropdownMenuSeparator />
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
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
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

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { 
  CATEGORY_LABELS, 
  CATEGORY_ICONS,
  ServiceCallMessage 
} from "@/hooks/useServiceCallMessages";

interface ResolveMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ServiceCallMessage | null;
  osNumber?: number;
  onConfirm: (messageId: string, notes: string) => void;
  isLoading?: boolean;
}

export const ResolveMessageModal = ({
  open,
  onOpenChange,
  message,
  osNumber,
  onConfirm,
  isLoading,
}: ResolveMessageModalProps) => {
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (message) {
      onConfirm(message.id, notes);
      setNotes("");
    }
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Resolver Pendência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info */}
          <div className="flex items-center gap-2 flex-wrap">
            {osNumber && (
              <Badge variant="outline">OS #{osNumber}</Badge>
            )}
            {message.category && (
              <Badge variant="secondary">
                {CATEGORY_ICONS[message.category]} {CATEGORY_LABELS[message.category]}
              </Badge>
            )}
          </div>

          {/* Message preview */}
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="text-muted-foreground text-xs mb-1">Mensagem:</p>
            <p className="line-clamp-3">{message.content}</p>
          </div>

          {/* Resolution notes */}
          <div className="space-y-2">
            <Label htmlFor="resolution-notes">
              Observação de encerramento (opcional)
            </Label>
            <Textarea
              id="resolution-notes"
              placeholder="Ex: Peça entregue ao técnico. NF: 12345"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

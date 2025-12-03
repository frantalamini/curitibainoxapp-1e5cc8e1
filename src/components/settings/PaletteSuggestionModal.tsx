import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExtractedColor } from '@/lib/colorExtractor';
import { Check, Edit, X } from 'lucide-react';

interface PaletteSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedColors: ExtractedColor[];
  onApply: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export function PaletteSuggestionModal({
  open,
  onOpenChange,
  suggestedColors,
  onApply,
  onEdit,
  onCancel,
}: PaletteSuggestionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paleta Gerada com Sucesso!</DialogTitle>
          <DialogDescription>
            Identificamos as seguintes cores na sua logo:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {suggestedColors.map((color) => (
            <div key={color.role} className="text-center space-y-2">
              <div
                className="w-full h-16 rounded-lg border shadow-sm"
                style={{ backgroundColor: color.hex }}
              />
              <div>
                <p className="text-sm font-medium">{color.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {color.hex}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-center mb-4">
            Deseja utilizar a paleta de cores gerada automaticamente a partir da logo?
          </p>

          <div className="space-y-2">
            <Button
              onClick={onApply}
              className="w-full justify-start"
              variant="default"
            >
              <Check className="h-4 w-4 mr-2" />
              Sim, aplicar ao App
            </Button>

            <Button
              onClick={onEdit}
              className="w-full justify-start"
              variant="outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar paleta antes de aplicar
            </Button>

            <Button
              onClick={onCancel}
              className="w-full justify-start"
              variant="ghost"
            >
              <X className="h-4 w-4 mr-2" />
              Não aplicar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

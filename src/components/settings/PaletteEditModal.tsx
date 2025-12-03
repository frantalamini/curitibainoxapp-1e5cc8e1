import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExtractedColor } from '@/lib/colorExtractor';
import { convertFromHex, isValidHex } from '@/lib/colorUtils';

interface PaletteEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colors: ExtractedColor[];
  onSave: (editedColors: ExtractedColor[]) => void;
  onCancel: () => void;
}

export function PaletteEditModal({
  open,
  onOpenChange,
  colors,
  onSave,
  onCancel,
}: PaletteEditModalProps) {
  const [editedColors, setEditedColors] = useState<ExtractedColor[]>(colors);

  const handleHexChange = (index: number, newHex: string) => {
    const updated = [...editedColors];
    updated[index] = {
      ...updated[index],
      hex: newHex,
    };
    setEditedColors(updated);
  };

  const handleHexBlur = (index: number) => {
    const color = editedColors[index];
    let hex = color.hex;
    
    // Add # if missing
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    
    if (isValidHex(hex)) {
      const formats = convertFromHex(hex);
      const updated = [...editedColors];
      updated[index] = {
        ...updated[index],
        hex: formats.hex,
        rgb: formats.rgb,
        hsl: formats.hsl,
        cmyk: formats.cmyk,
      };
      setEditedColors(updated);
    }
  };

  const handleSave = () => {
    // Validate all colors before saving
    const validatedColors = editedColors.map(color => {
      let hex = color.hex;
      if (!hex.startsWith('#')) {
        hex = '#' + hex;
      }
      if (isValidHex(hex)) {
        const formats = convertFromHex(hex);
        return {
          ...color,
          hex: formats.hex,
          rgb: formats.rgb,
          hsl: formats.hsl,
          cmyk: formats.cmyk,
        };
      }
      return color;
    });
    
    onSave(validatedColors);
  };

  // Reset edited colors when modal opens with new colors
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setEditedColors(colors);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paleta Sugerida</DialogTitle>
          <DialogDescription>
            Ajuste as cores antes de aplicar ao aplicativo:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
          {editedColors.map((color, index) => (
            <div
              key={color.role}
              className="border rounded-lg p-3 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border shadow-sm shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="min-w-0">
                  <p className="font-medium truncate">{color.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {color.role}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs">HEX</Label>
                  <Input
                    value={color.hex}
                    onChange={(e) => handleHexChange(index, e.target.value)}
                    onBlur={() => handleHexBlur(index)}
                    className="font-mono text-sm h-8"
                    placeholder="#000000"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">R:</span>{' '}
                    <span className="font-mono">{color.rgb.r}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">G:</span>{' '}
                    <span className="font-mono">{color.rgb.g}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">B:</span>{' '}
                    <span className="font-mono">{color.rgb.b}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  HSL: {Math.round(color.hsl.h)}°, {Math.round(color.hsl.s)}%, {Math.round(color.hsl.l)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Aplicar Paleta ao App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

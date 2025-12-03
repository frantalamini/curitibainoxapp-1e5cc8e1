import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Trash2 } from "lucide-react";
import { ColorPalette, ColorPaletteUpdate } from "@/hooks/useColorPalette";
import {
  convertFromHex,
  convertFromRgb,
  convertFromHsl,
  convertFromCmyk,
  isValidHex,
  ColorFormats,
} from "@/lib/colorUtils";

interface ColorCardProps {
  color: ColorPalette;
  onSave: (data: ColorPaletteUpdate & { id: string }) => void;
  onDelete: () => void;
  isSaving?: boolean;
}

const roleLabels: Record<string, string> = {
  primary: "Primária",
  secondary: "Secundária",
  accent: "Acento",
  success: "Sucesso",
  warning: "Alerta",
  destructive: "Perigo",
};

export const ColorCard = ({ color, onSave, onDelete, isSaving }: ColorCardProps) => {
  const [hex, setHex] = useState(color.hex);
  const [rgb, setRgb] = useState({ r: color.rgb_r, g: color.rgb_g, b: color.rgb_b });
  const [hsl, setHsl] = useState({ h: color.hsl_h, s: color.hsl_s, l: color.hsl_l });
  const [cmyk, setCmyk] = useState({ c: color.cmyk_c, m: color.cmyk_m, y: color.cmyk_y, k: color.cmyk_k });

  useEffect(() => {
    setHex(color.hex);
    setRgb({ r: color.rgb_r, g: color.rgb_g, b: color.rgb_b });
    setHsl({ h: color.hsl_h, s: color.hsl_s, l: color.hsl_l });
    setCmyk({ c: color.cmyk_c, m: color.cmyk_m, y: color.cmyk_y, k: color.cmyk_k });
  }, [color]);

  const updateFromFormats = (formats: ColorFormats) => {
    setHex(formats.hex);
    setRgb(formats.rgb);
    setHsl(formats.hsl);
    setCmyk(formats.cmyk);
  };

  const handleHexChange = (value: string) => {
    setHex(value);
    if (isValidHex(value)) {
      const formats = convertFromHex(value);
      setRgb(formats.rgb);
      setHsl(formats.hsl);
      setCmyk(formats.cmyk);
    }
  };

  const handleRgbChange = (key: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [key]: Math.max(0, Math.min(255, value)) };
    setRgb(newRgb);
    const formats = convertFromRgb(newRgb.r, newRgb.g, newRgb.b);
    setHex(formats.hex);
    setHsl(formats.hsl);
    setCmyk(formats.cmyk);
  };

  const handleHslChange = (key: 'h' | 's' | 'l', value: number) => {
    const max = key === 'h' ? 360 : 100;
    const newHsl = { ...hsl, [key]: Math.max(0, Math.min(max, value)) };
    setHsl(newHsl);
    const formats = convertFromHsl(newHsl.h, newHsl.s, newHsl.l);
    setHex(formats.hex);
    setRgb(formats.rgb);
    setCmyk(formats.cmyk);
  };

  const handleCmykChange = (key: 'c' | 'm' | 'y' | 'k', value: number) => {
    const newCmyk = { ...cmyk, [key]: Math.max(0, Math.min(100, value)) };
    setCmyk(newCmyk);
    const formats = convertFromCmyk(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k);
    setHex(formats.hex);
    setRgb(formats.rgb);
    setHsl(formats.hsl);
  };

  const handleSave = () => {
    onSave({
      id: color.id,
      hex,
      rgb_r: rgb.r,
      rgb_g: rgb.g,
      rgb_b: rgb.b,
      hsl_h: hsl.h,
      hsl_s: hsl.s,
      hsl_l: hsl.l,
      cmyk_c: cmyk.c,
      cmyk_m: cmyk.m,
      cmyk_y: cmyk.y,
      cmyk_k: cmyk.k,
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header with preview and name */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl border-2 border-border shadow-sm shrink-0"
            style={{ backgroundColor: isValidHex(hex) ? hex : color.hex }}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{color.name}</h4>
            <p className="text-xs text-muted-foreground">
              {roleLabels[color.role] || color.role}
            </p>
          </div>
        </div>

        {/* HEX */}
        <div>
          <Label className="text-xs text-muted-foreground">HEX</Label>
          <Input
            value={hex}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#000000"
            className="h-9 font-mono text-sm"
          />
        </div>

        {/* RGB */}
        <div>
          <Label className="text-xs text-muted-foreground">RGB</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground">R</span>
              <Input
                type="number"
                min={0}
                max={255}
                value={rgb.r}
                onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">G</span>
              <Input
                type="number"
                min={0}
                max={255}
                value={rgb.g}
                onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">B</span>
              <Input
                type="number"
                min={0}
                max={255}
                value={rgb.b}
                onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* HSL */}
        <div>
          <Label className="text-xs text-muted-foreground">HSL</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground">H°</span>
              <Input
                type="number"
                min={0}
                max={360}
                value={hsl.h}
                onChange={(e) => handleHslChange('h', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">S%</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={hsl.s}
                onChange={(e) => handleHslChange('s', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">L%</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={hsl.l}
                onChange={(e) => handleHslChange('l', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* CMYK */}
        <div>
          <Label className="text-xs text-muted-foreground">CMYK</Label>
          <div className="grid grid-cols-4 gap-1.5">
            <div>
              <span className="text-[10px] text-muted-foreground">C%</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={cmyk.c}
                onChange={(e) => handleCmykChange('c', parseInt(e.target.value) || 0)}
                className="h-8 text-sm px-2"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">M%</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={cmyk.m}
                onChange={(e) => handleCmykChange('m', parseInt(e.target.value) || 0)}
                className="h-8 text-sm px-2"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Y%</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={cmyk.y}
                onChange={(e) => handleCmykChange('y', parseInt(e.target.value) || 0)}
                className="h-8 text-sm px-2"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">K%</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={cmyk.k}
                onChange={(e) => handleCmykChange('k', parseInt(e.target.value) || 0)}
                className="h-8 text-sm px-2"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

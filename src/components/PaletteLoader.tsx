import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ColorPalette {
  role: string;
  hsl_h: number;
  hsl_s: number;
  hsl_l: number;
}

const PaletteLoader = () => {
  useEffect(() => {
    const loadAndApplyPalette = async () => {
      try {
        const { data: colors, error } = await supabase
          .from("color_palettes")
          .select("role, hsl_h, hsl_s, hsl_l")
          .eq("is_active", true);

        if (error || !colors || colors.length === 0) return;

        const root = document.documentElement;

        colors.forEach((color: ColorPalette) => {
          const hslValue = `${color.hsl_h} ${color.hsl_s}% ${color.hsl_l}%`;

          switch (color.role) {
            case 'primary':
              root.style.setProperty('--primary', hslValue);
              root.style.setProperty('--sidebar-primary', hslValue);
              root.style.setProperty('--ring', hslValue);
              break;
            case 'secondary':
              root.style.setProperty('--secondary', hslValue);
              break;
            case 'accent':
              root.style.setProperty('--accent', hslValue);
              break;
            case 'success':
              root.style.setProperty('--success', hslValue);
              break;
            case 'warning':
              root.style.setProperty('--warning', hslValue);
              break;
            case 'destructive':
              root.style.setProperty('--destructive', hslValue);
              break;
          }
        });
      } catch (err) {
        console.error("Erro ao carregar paleta de cores:", err);
      }
    };

    loadAndApplyPalette();
  }, []);

  return null;
};

export default PaletteLoader;

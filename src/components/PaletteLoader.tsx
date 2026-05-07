import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ColorPalette {
  role: string;
  hex: string;
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
          .select("role, hex, hsl_h, hsl_s, hsl_l")
          .eq("is_active", true);

        if (error || !colors || colors.length === 0) return;

        const root = document.documentElement;

        colors.forEach((color: ColorPalette) => {
          const hslValue = `${color.hsl_h} ${color.hsl_s}% ${color.hsl_l}%`;

          switch (color.role) {
            case "primary":
              root.style.setProperty("--primary", hslValue);
              root.style.setProperty("--sidebar-primary", hslValue);
              root.style.setProperty("--ring", hslValue);
              root.style.setProperty("--color-primary", color.hex);
              root.style.setProperty("--color-text-label", color.hex);
              break;
            case "secondary":
              root.style.setProperty("--secondary", hslValue);
              root.style.setProperty("--color-secondary", color.hex);
              break;
            case "accent":
              root.style.setProperty("--accent", hslValue);
              root.style.setProperty("--color-accent", color.hex);
              break;
            case "success":
              root.style.setProperty("--success", hslValue);
              root.style.setProperty("--color-success", color.hex);
              break;
            case "warning":
              root.style.setProperty("--warning", hslValue);
              root.style.setProperty("--color-warning", color.hex);
              break;
            case "destructive":
              root.style.setProperty("--destructive", hslValue);
              root.style.setProperty("--color-error", color.hex);
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

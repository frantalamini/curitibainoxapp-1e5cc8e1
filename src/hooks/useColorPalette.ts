import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive';

export interface ColorPalette {
  id: string;
  name: string;
  role: ColorRole;
  hex: string;
  rgb_r: number;
  rgb_g: number;
  rgb_b: number;
  hsl_h: number;
  hsl_s: number;
  hsl_l: number;
  cmyk_c: number;
  cmyk_m: number;
  cmyk_y: number;
  cmyk_k: number;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ColorPaletteInsert = Omit<ColorPalette, 'id' | 'created_at' | 'updated_at'>;
export type ColorPaletteUpdate = Partial<ColorPaletteInsert>;

export const useColorPalette = () => {
  const queryClient = useQueryClient();

  const { data: colors, isLoading } = useQuery({
    queryKey: ["color-palettes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("color_palettes")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ColorPalette[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createColor = useMutation({
    mutationFn: async (color: ColorPaletteInsert) => {
      const { data, error } = await supabase
        .from("color_palettes")
        .insert(color)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["color-palettes"] });
      toast.success("Cor adicionada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao adicionar cor:", error);
      toast.error("Erro ao adicionar cor");
    },
  });

  const updateColor = useMutation({
    mutationFn: async ({ id, ...updates }: ColorPaletteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("color_palettes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["color-palettes"] });
      toast.success("Cor atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar cor:", error);
      toast.error("Erro ao atualizar cor");
    },
  });

  const deleteColor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("color_palettes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["color-palettes"] });
      toast.success("Cor removida com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover cor:", error);
      toast.error("Erro ao remover cor");
    },
  });

  const applyPalette = () => {
    if (!colors || colors.length === 0) return;

    const root = document.documentElement;

    colors.forEach((color) => {
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

    toast.success("Paleta aplicada com sucesso!");
  };

  return {
    colors,
    isLoading,
    createColor,
    updateColor,
    deleteColor,
    applyPalette,
  };
};

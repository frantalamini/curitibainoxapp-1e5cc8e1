-- Create color_palettes table
CREATE TABLE public.color_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary', 'accent', 'success', 'warning', 'destructive')),
  hex TEXT NOT NULL,
  rgb_r INTEGER NOT NULL,
  rgb_g INTEGER NOT NULL,
  rgb_b INTEGER NOT NULL,
  hsl_h NUMERIC NOT NULL,
  hsl_s NUMERIC NOT NULL,
  hsl_l NUMERIC NOT NULL,
  cmyk_c NUMERIC NOT NULL,
  cmyk_m NUMERIC NOT NULL,
  cmyk_y NUMERIC NOT NULL,
  cmyk_k NUMERIC NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role)
);

-- Enable RLS
ALTER TABLE public.color_palettes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view color palettes"
ON public.color_palettes FOR SELECT
USING (true);

CREATE POLICY "Admins can insert color palettes"
ON public.color_palettes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update color palettes"
ON public.color_palettes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete color palettes"
ON public.color_palettes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial colors
INSERT INTO public.color_palettes (name, role, hex, rgb_r, rgb_g, rgb_b, hsl_h, hsl_s, hsl_l, cmyk_c, cmyk_m, cmyk_y, cmyk_k, display_order)
VALUES
  ('Primária', 'primary', '#18487A', 24, 72, 122, 211, 67, 29, 80, 41, 0, 52, 1),
  ('Secundária', 'secondary', '#F1F5F9', 241, 245, 249, 210, 40, 96, 3, 2, 0, 2, 2),
  ('Acento', 'accent', '#E0F2FE', 224, 242, 254, 200, 94, 94, 12, 5, 0, 0, 3),
  ('Sucesso', 'success', '#16A34A', 22, 163, 74, 142, 76, 36, 87, 0, 55, 36, 4),
  ('Alerta', 'warning', '#F59E0B', 245, 158, 11, 38, 92, 50, 0, 36, 96, 4, 5),
  ('Perigo', 'destructive', '#EF4444', 239, 68, 68, 0, 84, 60, 0, 72, 72, 6, 6);

-- Trigger for updated_at
CREATE TRIGGER update_color_palettes_updated_at
BEFORE UPDATE ON public.color_palettes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
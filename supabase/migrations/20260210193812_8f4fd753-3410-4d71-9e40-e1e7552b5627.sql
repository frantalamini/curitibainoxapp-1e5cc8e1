
-- 1. Create sale_delivery_trips table
CREATE TABLE public.sale_delivery_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.profiles(user_id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  route_group_id UUID,
  route_order INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','em_deslocamento','concluido')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  current_lat NUMERIC,
  current_lng NUMERIC,
  estimated_distance_km NUMERIC,
  distance_km NUMERIC,
  position_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create sale_delivery_proofs table
CREATE TABLE public.sale_delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.sale_delivery_trips(id),
  delivered_by UUID REFERENCES public.profiles(user_id),
  receiver_name TEXT NOT NULL,
  receiver_position TEXT,
  signature_storage_path TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.sale_delivery_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_delivery_proofs ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for sale_delivery_trips
CREATE POLICY "Authenticated users can view delivery trips"
  ON public.sale_delivery_trips FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create delivery trips"
  ON public.sale_delivery_trips FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update delivery trips"
  ON public.sale_delivery_trips FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete delivery trips"
  ON public.sale_delivery_trips FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. RLS policies for sale_delivery_proofs
CREATE POLICY "Authenticated users can view delivery proofs"
  ON public.sale_delivery_proofs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create delivery proofs"
  ON public.sale_delivery_proofs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update delivery proofs"
  ON public.sale_delivery_proofs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete delivery proofs"
  ON public.sale_delivery_proofs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Triggers for updated_at
CREATE TRIGGER update_sale_delivery_trips_updated_at
  BEFORE UPDATE ON public.sale_delivery_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sale_delivery_proofs_updated_at
  BEFORE UPDATE ON public.sale_delivery_proofs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create sale-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('sale-attachments', 'sale-attachments', false);

-- 8. Storage RLS policies
CREATE POLICY "Authenticated users can upload sale attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sale-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view sale attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sale-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sale attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'sale-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete sale attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sale-attachments' AND public.has_role(auth.uid(), 'admin'));

-- 9. Indexes
CREATE INDEX idx_sale_delivery_trips_sale_id ON public.sale_delivery_trips(sale_id);
CREATE INDEX idx_sale_delivery_trips_route_group ON public.sale_delivery_trips(route_group_id);
CREATE INDEX idx_sale_delivery_trips_status ON public.sale_delivery_trips(status);
CREATE INDEX idx_sale_delivery_proofs_sale_id ON public.sale_delivery_proofs(sale_id);

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SaleDeliveryTrip {
  id: string;
  sale_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  route_group_id: string | null;
  route_order: number | null;
  status: "pending" | "em_deslocamento" | "concluido";
  started_at: string | null;
  finished_at: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  estimated_distance_km: number | null;
  distance_km: number | null;
  position_updated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  sales?: {
    sale_number: number;
    total: number;
    clients?: {
      full_name: string;
      phone: string;
      street: string | null;
      number: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      cep: string | null;
    } | null;
  } | null;
  vehicles?: {
    name: string;
    plate: string;
  } | null;
}

export interface SaleDeliveryTripInsert {
  sale_id: string;
  driver_id?: string;
  vehicle_id?: string;
  route_group_id?: string;
  route_order?: number;
  status?: string;
  started_at?: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  estimated_distance_km?: number;
}

// Fetch pending deliveries (sales with SALE/INVOICED status without completed trip)
export const usePendingDeliveries = () => {
  return useQuery({
    queryKey: ["pending-deliveries"],
    queryFn: async () => {
      // Get sales with SALE or INVOICED status
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          sale_number,
          total,
          status,
          created_at,
          clients (
            id,
            full_name,
            phone,
            street,
            number,
            neighborhood,
            city,
            state,
            cep
          )
        `)
        .in("status", ["SALE", "INVOICED"])
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      // Get sale IDs that already have a completed delivery proof
      const saleIds = sales?.map(s => s.id) || [];
      if (saleIds.length === 0) return [];

      const { data: proofs, error: proofsError } = await supabase
        .from("sale_delivery_proofs")
        .select("sale_id")
        .in("sale_id", saleIds);

      if (proofsError) throw proofsError;

      const deliveredSaleIds = new Set(proofs?.map(p => p.sale_id) || []);

      // Return only sales without proof
      return (sales || []).filter(s => !deliveredSaleIds.has(s.id));
    },
  });
};

// Fetch trips for a route group
export const useRouteGroupTrips = (routeGroupId?: string) => {
  return useQuery({
    queryKey: ["route-group-trips", routeGroupId],
    queryFn: async () => {
      if (!routeGroupId) return [];

      const { data, error } = await supabase
        .from("sale_delivery_trips")
        .select(`
          *,
          sales:sale_id (
            sale_number,
            total,
            clients (
              full_name,
              phone,
              street,
              number,
              neighborhood,
              city,
              state,
              cep
            )
          ),
          vehicles:vehicle_id (name, plate)
        `)
        .eq("route_group_id", routeGroupId)
        .order("route_order", { ascending: true });

      if (error) throw error;
      return (data || []) as SaleDeliveryTrip[];
    },
    enabled: !!routeGroupId,
  });
};

// Fetch active trip for a sale
export const useActiveSaleTrip = (saleId?: string) => {
  return useQuery({
    queryKey: ["active-sale-trip", saleId],
    queryFn: async () => {
      if (!saleId) return null;

      const { data, error } = await supabase
        .from("sale_delivery_trips")
        .select("*")
        .eq("sale_id", saleId)
        .eq("status", "em_deslocamento")
        .maybeSingle();

      if (error) throw error;
      return data as SaleDeliveryTrip | null;
    },
    enabled: !!saleId,
  });
};

export const useSaleDeliveryTripsMutations = () => {
  const queryClient = useQueryClient();

  const createTrips = useMutation({
    mutationFn: async (trips: SaleDeliveryTripInsert[]) => {
      const { data, error } = await supabase
        .from("sale_delivery_trips")
        .insert(trips)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["route-group-trips"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar rota: " + error.message);
    },
  });

  const startTrip = useMutation({
    mutationFn: async ({ id, origin_lat, origin_lng }: { id: string; origin_lat: number; origin_lng: number }) => {
      const { data, error } = await supabase
        .from("sale_delivery_trips")
        .update({
          status: "em_deslocamento",
          started_at: new Date().toISOString(),
          origin_lat,
          origin_lng,
          current_lat: origin_lat,
          current_lng: origin_lng,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-group-trips"] });
      queryClient.invalidateQueries({ queryKey: ["active-sale-trip"] });
      toast.success("Deslocamento iniciado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao iniciar deslocamento: " + error.message);
    },
  });

  const finishTrip = useMutation({
    mutationFn: async ({ id, distance_km }: { id: string; distance_km?: number }) => {
      const { data, error } = await supabase
        .from("sale_delivery_trips")
        .update({
          status: "concluido",
          finished_at: new Date().toISOString(),
          ...(distance_km !== undefined ? { distance_km } : {}),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route-group-trips"] });
      queryClient.invalidateQueries({ queryKey: ["active-sale-trip"] });
      toast.success("Chegada registrada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar chegada: " + error.message);
    },
  });

  const updateTripPosition = async (tripId: string, lat: number, lng: number) => {
    await supabase
      .from("sale_delivery_trips")
      .update({
        current_lat: lat,
        current_lng: lng,
        position_updated_at: new Date().toISOString(),
      })
      .eq("id", tripId);
  };

  return {
    createTrips,
    startTrip,
    finishTrip,
    updateTripPosition,
  };
};

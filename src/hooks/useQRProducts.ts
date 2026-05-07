import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QRProduct {
  id: string;
  name: string;
  model_code: string;
  category?: string;
  description?: string;
  serial_format: string;
  serial_prefix: string;
  next_serial: number;
  lot_format: string;
  lots_generated: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type QRProductInsert = Omit<
  QRProduct,
  "id" | "created_at" | "updated_at" | "created_by" | "lots_generated"
>;

const TABLE = "qr_products";

export const useQRProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as QRProduct[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (product: QRProductInsert) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario nao autenticado");
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert([{ ...product, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data as QRProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({
        title: "Sucesso",
        description: "Produto cadastrado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<QRProduct> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as QRProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TABLE] });
      toast({ title: "Sucesso", description: "Produto removido com sucesso" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    products,
    isLoading,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
  };
};

export const useQRProduct = (id?: string) => {
  return useQuery({
    queryKey: [TABLE, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as QRProduct;
    },
    enabled: !!id,
  });
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CadastroTipo } from "./useCadastros";

export type Client = {
  id: string;
  full_name: string;
  nome_fantasia?: string;
  email?: string;
  phone: string;
  phone_2?: string;
  tipos?: CadastroTipo[];
  
  // Campos de endereço detalhado
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  state_registration?: string;
  
  address?: string; // Legacy - manter para compatibilidade
  cpf_cnpj?: string;
  notes?: string;
  
  // Responsáveis no estabelecimento
  responsible_financial?: {
    name?: string;
    phone?: string;
  } | null;
  responsible_technical?: {
    name?: string;
    phone?: string;
  } | null;
  responsible_legal?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ClientInsert = Omit<Client, "id" | "created_at" | "updated_at" | "created_by">;

export const useClients = () => {
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("clients")
        .insert([{ ...client, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Cliente criado",
        description: "Cliente criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...client }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(client)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Cliente excluído",
        description: "Cliente excluído com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
  };
};

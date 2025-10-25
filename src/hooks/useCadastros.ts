import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type CadastroTipo = 
  | 'cliente' 
  | 'fornecedor' 
  | 'transportador' 
  | 'colaborador' 
  | 'outro';

export type Cadastro = {
  id: string;
  full_name: string;
  nome_fantasia?: string;
  email?: string;
  phone: string;
  phone_2?: string;
  cpf_cnpj?: string;
  city?: string;
  state?: string;
  tipo: CadastroTipo;
  tipos: CadastroTipo[];
  created_at: string;
  updated_at: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  state_registration?: string;
  address?: string;
  notes?: string;
  responsible_financial?: { name?: string; phone?: string; } | null;
  responsible_technical?: { name?: string; phone?: string; } | null;
  responsible_legal?: { name?: string; phone?: string; email?: string; } | null;
  created_by: string;
};

type UseCadastrosParams = {
  tipo?: CadastroTipo | 'todos';
  search?: string;
  page?: number;
  perPage?: number;
  orderBy?: 'full_name' | 'created_at';
  orderDirection?: 'asc' | 'desc';
};

export const useCadastros = (params: UseCadastrosParams = {}) => {
  const queryClient = useQueryClient();
  
  const {
    tipo = 'todos',
    search = '',
    page = 1,
    perPage = 10,
    orderBy = 'full_name',
    orderDirection = 'asc'
  } = params;

  // Query para dados paginados
  const { data, isLoading } = useQuery({
    queryKey: ['cadastros', tipo, search, page, perPage, orderBy, orderDirection],
    queryFn: async () => {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

      // Filtro por tipo (usando array contains)
      if (tipo !== 'todos') {
        query = query.contains('tipos', [tipo]);
      }

      // Busca geral (nome, email, cpf_cnpj, nome_fantasia)
      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,` +
          `nome_fantasia.ilike.%${search}%,` +
          `email.ilike.%${search}%,` +
          `cpf_cnpj.ilike.%${search}%`
        );
      }

      // Ordenação
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Paginação
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data as Cadastro[],
        count: count || 0,
        page,
        perPage,
        totalPages: Math.ceil((count || 0) / perPage)
      };
    },
  });

  // Query para contadores por tipo (sem paginação)
  const { data: counters } = useQuery({
    queryKey: ['cadastros-counters'],
    queryFn: async () => {
      const types: CadastroTipo[] = [
        'cliente',
        'fornecedor',
        'transportador',
        'colaborador',
        'outro'
      ];

      const results = await Promise.all(
        types.map(async (t) => {
          const { count } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .contains('tipos', [t]);
          return { tipo: t, count: count || 0 };
        })
      );

      const totalCount = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      return {
        todos: totalCount.count || 0,
        ...Object.fromEntries(results.map(r => [r.tipo, r.count]))
      };
    },
  });

  // Mutations
  const createCadastro = useMutation({
    mutationFn: async (cadastro: Omit<Cadastro, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...cadastro, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastros'] });
      queryClient.invalidateQueries({ queryKey: ['cadastros-counters'] });
      toast({ title: "Cadastro criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cadastro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCadastro = useMutation({
    mutationFn: async ({ id, ...cadastro }: Partial<Cadastro> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(cadastro)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastros'] });
      queryClient.invalidateQueries({ queryKey: ['cadastros-counters'] });
      toast({ title: "Cadastro atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cadastro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCadastro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastros'] });
      queryClient.invalidateQueries({ queryKey: ['cadastros-counters'] });
      toast({ title: "Cadastro excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cadastro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    cadastros: data?.data || [],
    count: data?.count || 0,
    totalPages: data?.totalPages || 0,
    currentPage: data?.page || 1,
    counters,
    isLoading,
    createCadastro,
    updateCadastro,
    deleteCadastro,
  };
};

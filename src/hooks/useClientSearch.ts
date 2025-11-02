import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientSearchResult {
  id: string;
  full_name: string;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
}

export const useClientSearch = (searchTerm: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["client-search", searchTerm],
    queryFn: async ({ signal }) => {
      const q = searchTerm.trim();
      const cnpj = q.replace(/\D/g, ''); // Apenas dígitos
      
      // Lógica condicional: se tem 8+ dígitos, buscar APENAS por CNPJ
      const orFilter = cnpj.length >= 8
        ? `cpf_cnpj.ilike.%${cnpj}%`
        : `full_name.ilike.%${q}%,nome_fantasia.ilike.%${q}%`;
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, nome_fantasia, cpf_cnpj')
        .or(orFilter)
        .order('full_name', { ascending: true })
        .limit(10)
        .abortSignal(signal);

      if (error) throw error;
      return data as ClientSearchResult[];
    },
    enabled: enabled && searchTerm.length >= 2,
    staleTime: 30000,
  });
};

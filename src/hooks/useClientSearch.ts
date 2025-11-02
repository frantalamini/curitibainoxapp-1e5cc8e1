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
      const t = searchTerm.trim();
      const cnpj = t.replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, nome_fantasia, cpf_cnpj')
        .or(`full_name.ilike.%${t}%,nome_fantasia.ilike.%${t}%,cpf_cnpj.ilike.%${cnpj}%`)
        .limit(10)
        .order('full_name', { ascending: true })
        .abortSignal(signal);

      if (error) throw error;
      return data as ClientSearchResult[];
    },
    enabled: enabled && searchTerm.length >= 2,
    staleTime: 30000,
  });
};

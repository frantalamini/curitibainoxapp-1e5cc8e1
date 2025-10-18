import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CNPJData {
  company_name: string;
  trade_name: string;
  cnpj: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  state_registration?: string;
  phone?: string;
  email?: string;
}

interface CNPJLookupResponse {
  success: boolean;
  data: CNPJData | null;
  error?: string;
  sintegra_available?: boolean;
}

export const useCNPJLookup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Buscando dados do CNPJ:", cnpj);

      const { data, error: functionError } = await supabase.functions.invoke(
        "fetch-cnpj-data",
        {
          body: { cnpj },
        }
      );

      if (functionError) {
        console.error("Erro ao chamar edge function:", functionError);
        const errorMessage = "Erro ao buscar dados do CNPJ";
        setError(errorMessage);
        toast({
          title: "Erro ao buscar CNPJ",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }

      const response = data as CNPJLookupResponse;

      if (!response.success || !response.data) {
        const errorMessage = response.error || "CNPJ não encontrado";
        setError(errorMessage);
        toast({
          title: "CNPJ não encontrado",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }

      console.log("Dados do CNPJ encontrados:", response.data);

      // Mostrar aviso se Sintegra não estava disponível
      if (!response.sintegra_available && response.data.state === "PR") {
        toast({
          title: "Dados encontrados!",
          description:
            "Inscrição Estadual não foi encontrada automaticamente. Preencha manualmente se necessário.",
        });
      } else {
        toast({
          title: "Dados encontrados!",
          description: "Informações preenchidas automaticamente.",
        });
      }

      return response.data;
    } catch (err) {
      console.error("Erro inesperado:", err);
      const errorMessage = "Erro ao buscar dados do CNPJ";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const lookupCEP = async (cep: string): Promise<Partial<CNPJData> | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Buscando endereço pelo CEP:", cep);

      const cleanCEP = cep.replace(/\D/g, "");

      if (cleanCEP.length !== 8) {
        const errorMessage = "CEP deve conter 8 dígitos";
        setError(errorMessage);
        toast({
          title: "CEP inválido",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }

      const response = await fetch(
        `https://brasilapi.com.br/api/cep/v1/${cleanCEP}`
      );

      if (!response.ok) {
        const errorMessage = "CEP não encontrado";
        setError(errorMessage);
        toast({
          title: "CEP não encontrado",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      }

      const data = await response.json();

      toast({
        title: "CEP encontrado!",
        description: "Endereço preenchido automaticamente.",
      });

      return {
        cep: data.cep,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
      };
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
      const errorMessage = "Erro ao buscar CEP";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { lookupCNPJ, lookupCEP, isLoading, error };
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CNPJData {
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

interface BrasilAPIResponse {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  ddd_telefone_1?: string;
  email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();

    if (!cnpj) {
      return new Response(
        JSON.stringify({ success: false, error: 'CNPJ não informado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove formatação do CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');

    if (cleanCNPJ.length !== 14) {
      return new Response(
        JSON.stringify({ success: false, error: 'CNPJ deve conter 14 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Buscando dados para CNPJ: ${cleanCNPJ}`);

    // Buscar dados na BrasilAPI
    const brasilAPIResponse = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`,
      { 
        signal: AbortSignal.timeout(10000) // 10s timeout
      }
    );

    if (!brasilAPIResponse.ok) {
      const errorText = await brasilAPIResponse.text();
      console.error(`Erro BrasilAPI: ${brasilAPIResponse.status} - ${errorText}`);
      
      if (brasilAPIResponse.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: 'CNPJ não encontrado na Receita Federal' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao consultar Receita Federal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brasilAPIData: BrasilAPIResponse = await brasilAPIResponse.json();
    console.log('Dados recebidos da BrasilAPI:', JSON.stringify(brasilAPIData, null, 2));

    // Formatar CEP
    const formattedCEP = brasilAPIData.cep.replace(/(\d{5})(\d{3})/, '$1-$2');

    // Estruturar resposta
    const data: CNPJData = {
      company_name: brasilAPIData.razao_social,
      trade_name: brasilAPIData.nome_fantasia || brasilAPIData.razao_social,
      cnpj: brasilAPIData.cnpj,
      cep: formattedCEP,
      street: brasilAPIData.logradouro,
      number: brasilAPIData.numero || 'S/N',
      complement: brasilAPIData.complemento || '',
      neighborhood: brasilAPIData.bairro,
      city: brasilAPIData.municipio,
      state: brasilAPIData.uf,
      phone: brasilAPIData.ddd_telefone_1 || '',
      email: brasilAPIData.email || '',
    };

    // Tentar buscar Inscrição Estadual no Sintegra (PR)
    let sintegraAvailable = false;
    
    if (brasilAPIData.uf === 'PR') {
      try {
        console.log('Tentando buscar Inscrição Estadual no Sintegra PR...');
        
        // Nota: Sintegra PR pode ter CAPTCHA e não tem API pública oficial
        // Esta é uma tentativa que pode falhar - adicione lógica específica se necessário
        // Por enquanto, marcamos como indisponível
        
        sintegraAvailable = false;
        data.state_registration = ''; // Vazio, precisa ser preenchido manualmente
      } catch (error) {
        console.error('Erro ao consultar Sintegra:', error);
        sintegraAvailable = false;
      }
    }

    console.log('Retornando dados estruturados');
    
    return new Response(
      JSON.stringify({
        success: true,
        data,
        sintegra_available: sintegraAvailable,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    
    const errorObj = error as Error;
    
    if (errorObj.name === 'TimeoutError') {
      return new Response(
        JSON.stringify({ success: false, error: 'Timeout ao consultar serviços externos' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorObj.message || 'Erro interno ao processar requisição' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

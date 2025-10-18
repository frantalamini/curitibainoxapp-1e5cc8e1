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

// Função para formatar logradouro com tipo de via
const formatStreet = (logradouro: string): string => {
  if (!logradouro) return '';
  
  // Lista de tipos de logradouro comuns
  const streetTypes = [
    'Rua', 'Avenida', 'Alameda', 'Travessa', 'Praça',
    'Via', 'Rodovia', 'Estrada', 'Caminho', 'Largo',
    'Beco', 'Viela', 'Quadra', 'Conjunto', 'Passagem',
    'Ladeira', 'Servidão', 'Viaduto', 'Ponte'
  ];
  
  // Verifica se já tem um tipo de logradouro no início (case-insensitive)
  const hasType = streetTypes.some(type => 
    logradouro.toLowerCase().startsWith(type.toLowerCase())
  );
  
  // Se já tem tipo, retorna como está; senão, adiciona "Rua"
  return hasType ? logradouro : `Rua ${logradouro}`;
};

// Função para formatar telefone com DDD
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 11) {
    // Celular moderno: (XX) 9XXXX-XXXX
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  } 
  else if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const numero = digits.slice(2);
    const primeiroDigito = numero.charAt(0);
    
    // Se começa com 8 ou 9, adiciona o 9 extra (celular antigo)
    if (primeiroDigito === '8' || primeiroDigito === '9') {
      // Transforma em: (XX) 9YYYY-ZZZZ mantendo os últimos 4 dígitos fiéis
      return `(${ddd}) 9${numero.slice(0,4)}-${numero.slice(4)}`;
    } else {
      // Telefone fixo normal: (XX) XXXX-XXXX
      return `(${ddd}) ${numero.slice(0,4)}-${numero.slice(4)}`;
    }
  }
  
  return phone; // Retorna original se formato inválido
};

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
      street: formatStreet(brasilAPIData.logradouro),
      number: brasilAPIData.numero || 'S/N',
      complement: brasilAPIData.complemento || '',
      neighborhood: brasilAPIData.bairro,
      city: brasilAPIData.municipio,
      state: brasilAPIData.uf,
      phone: formatPhone(brasilAPIData.ddd_telefone_1 || ''),
      email: brasilAPIData.email || '',
    };

    // Tentar buscar Inscrição Estadual via ReceitaWS
    let sintegraAvailable = false;
    
    try {
      console.log('Tentando buscar Inscrição Estadual na ReceitaWS...');
      
      const receitaWSResponse = await fetch(
        `https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (receitaWSResponse.ok) {
        const receitaWSData = await receitaWSResponse.json();
        console.log('Dados ReceitaWS:', JSON.stringify(receitaWSData, null, 2));
        
        // ReceitaWS retorna o campo "inscricao_estadual"
        if (receitaWSData.inscricao_estadual && receitaWSData.inscricao_estadual !== '') {
          data.state_registration = receitaWSData.inscricao_estadual;
          sintegraAvailable = true;
          console.log('Inscrição Estadual encontrada:', data.state_registration);
        } else {
          console.log('Inscrição Estadual não disponível na ReceitaWS');
          data.state_registration = '';
        }
      } else {
        console.warn('ReceitaWS retornou status:', receitaWSResponse.status);
        data.state_registration = '';
      }
    } catch (error) {
      console.error('Erro ao consultar ReceitaWS para IE:', error);
      sintegraAvailable = false;
      data.state_registration = '';
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

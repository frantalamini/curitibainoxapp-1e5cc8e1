import { corsHeaders } from "../_shared/cors.ts";

interface GeocodeRequest {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

interface GeocodeResponse {
  lat: number | null;
  lng: number | null;
  success: boolean;
  error?: string;
  displayName?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GeocodeRequest = await req.json();
    
    // Construir query de busca
    const queryParts: string[] = [];
    
    if (body.street) {
      queryParts.push(body.street);
    }
    if (body.number) {
      queryParts.push(body.number);
    }
    if (body.neighborhood) {
      queryParts.push(body.neighborhood);
    }
    if (body.city) {
      queryParts.push(body.city);
    }
    if (body.state) {
      queryParts.push(body.state);
    }
    if (body.cep) {
      queryParts.push(body.cep);
    }
    
    // Adicionar Brasil para melhorar precisão
    queryParts.push("Brasil");
    
    const query = queryParts.join(", ");
    
    if (!query || query === "Brasil") {
      return new Response(
        JSON.stringify({
          lat: null,
          lng: null,
          success: false,
          error: "Endereço insuficiente para geocodificação",
        } as GeocodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Chamar API do Nominatim (OpenStreetMap) - gratuito, sem API key
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "CuritibaInoxApp/1.0 (service-call-tracking)",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const results = await response.json();
    
    if (results && results.length > 0) {
      const result = results[0];
      return new Response(
        JSON.stringify({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          success: true,
          displayName: result.display_name,
        } as GeocodeResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Nenhum resultado encontrado
    return new Response(
      JSON.stringify({
        lat: null,
        lng: null,
        success: false,
        error: "Endereço não encontrado",
      } as GeocodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Geocoding error:", error);
    return new Response(
      JSON.stringify({
        lat: null,
        lng: null,
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      } as GeocodeResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

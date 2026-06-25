// Preenche os campos técnicos de uma OS a partir de áudio (relato do técnico)
// e/ou fotos (equipamento, placa de identificação, defeito), via Gemini multimodal.
// Retorna SOMENTE campos técnicos — nunca preço, item ou valor (técnico não vê finanças).
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_AI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// Limites de segurança (base64). Áudio ~10MB; até 4 imagens.
const MAX_AUDIO_B64 = 14_000_000;
const MAX_IMAGES = 4;

const PROMPT = `Você é um técnico sênior de assistência técnica preenchendo uma Ordem de Serviço (OS).
Receberá o RELATO EM ÁUDIO do técnico em campo e/ou FOTOS do equipamento (incluindo a placa/etiqueta de identificação e o defeito).

Sua tarefa: extrair e organizar as informações em português brasileiro, preenchendo os campos abaixo.
REGRAS:
- Baseie-se SOMENTE no que ouvir no áudio e vir nas fotos. NÃO invente dados.
- Se uma informação não estiver disponível, retorne o campo como null (não chute).
- "equipment_manufacturer" e "equipment_serial_number" vêm normalmente da placa/etiqueta nas fotos.
- "problem_description" = o problema relatado (cliente/sintoma). "technical_diagnosis" = a análise técnica. "defect_found" = o defeito concreto identificado.
- Mantenha termos técnicos, marcas e modelos exatamente como ditos/escritos.
- NÃO inclua preços, valores, peças cotadas ou qualquer dado financeiro.

Responda APENAS em JSON puro (sem markdown), neste formato:
{
  "problem_description": "string ou null",
  "technical_diagnosis": "string ou null",
  "defect_found": "string ou null",
  "equipment_description": "string ou null",
  "equipment_manufacturer": "string ou null",
  "equipment_serial_number": "string ou null",
  "notes": "string ou null",
  "confidence": "high" | "medium" | "low"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: userRoles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAccess = userRoles?.some(
      (r: { role: string }) => r.role === "admin" || r.role === "technician",
    );
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const { audio, images } = await req.json();
    const imageList: string[] = Array.isArray(images) ? images : [];

    if (!audio && imageList.length === 0) {
      return new Response(
        JSON.stringify({ error: "Envie ao menos um áudio ou uma foto" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (audio && audio.length > MAX_AUDIO_B64) {
      return new Response(
        JSON.stringify({ error: "Áudio muito grande. Máximo: 10MB" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Monta o conteúdo multimodal: prompt + áudio + imagens (limitadas).
    const content: any[] = [{ type: "text", text: PROMPT }];

    if (audio) {
      content.push({
        type: "input_audio",
        input_audio: { data: audio, format: "webm" },
      });
    }

    for (const img of imageList.slice(0, MAX_IMAGES)) {
      let mimeType = "image/jpeg";
      let base64Data = img;
      if (typeof img === "string" && img.startsWith("data:")) {
        const matches = img.match(/data:([^;]+);base64,(.+)/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      content.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64Data}` },
      });
    }

    const response = await fetch(GEMINI_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-pro",
        messages: [{ role: "user", content }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini AI error:", response.status, errorText);
      if (response.status === 429) {
        throw new Error(
          "Limite de requisições excedido. Tente novamente em alguns instantes.",
        );
      }
      throw new Error(`Gemini AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const raw = aiResponse.choices?.[0]?.message?.content;
    if (!raw) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      // Allowlist explícita — nunca devolve campo financeiro mesmo que o modelo invente.
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            problem_description: parsed.problem_description ?? null,
            technical_diagnosis: parsed.technical_diagnosis ?? null,
            defect_found: parsed.defect_found ?? null,
            equipment_description: parsed.equipment_description ?? null,
            equipment_manufacturer: parsed.equipment_manufacturer ?? null,
            equipment_serial_number: parsed.equipment_serial_number ?? null,
            notes: parsed.notes ?? null,
            confidence: parsed.confidence ?? "medium",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", raw);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível interpretar a resposta da IA",
          rawResponse: raw,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

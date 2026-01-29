// OCR Edge Function for extracting receipt amounts using Gemini Vision
import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const LOVABLE_AI_URL = "https://ai.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageBase64 or imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the image content for the vision model
    let imageContent: any;
    if (imageBase64) {
      // Extract MIME type if provided as data URL
      let mimeType = "image/jpeg";
      let base64Data = imageBase64;
      
      if (imageBase64.startsWith("data:")) {
        const matches = imageBase64.match(/data:([^;]+);base64,(.+)/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }
      
      imageContent = {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Data}`
        }
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      };
    }

    // Call Lovable AI (Gemini Vision) to extract receipt information
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              imageContent,
              {
                type: "text",
                text: `Analise esta imagem de um comprovante/nota fiscal/recibo e extraia as seguintes informações:
1. O valor TOTAL da compra/pagamento (apenas o valor final, não subtotais)
2. Uma breve descrição do que foi comprado (se visível)
3. A data do comprovante (se visível)

Responda APENAS em JSON no seguinte formato, sem markdown:
{
  "amount": 123.45,
  "description": "Descrição breve do item/serviço",
  "date": "2024-01-15",
  "confidence": "high" | "medium" | "low",
  "notes": "Observações se houver dificuldade na leitura"
}

Se não conseguir identificar o valor, retorne amount como null.
Se não conseguir identificar a data, retorne date como null.
Priorize extrair o valor total corretamente. Valores em R$ (reais brasileiros).`
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to process image", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response from AI
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const extractedData = JSON.parse(cleanedContent);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            amount: extractedData.amount,
            description: extractedData.description || null,
            date: extractedData.date || null,
            confidence: extractedData.confidence || "medium",
            notes: extractedData.notes || null
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to parse extracted data",
          rawResponse: content 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

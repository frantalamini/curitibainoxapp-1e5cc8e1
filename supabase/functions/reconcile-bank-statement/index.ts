import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OFXTransaction {
  fitId: string;
  date: string;
  amount: number;
  description: string;
  type: string;
}

interface SystemTransaction {
  id: string;
  description: string | null;
  amount: number;
  direction: string;
  due_date: string;
  paid_at: string | null;
}

interface MatchSuggestion {
  ofxTransaction: OFXTransaction;
  systemTransaction: SystemTransaction | null;
  confidence: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { ofxTransactions, accountId, startDate, endDate } = await req.json();

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch system transactions for the period
    const { data: systemTransactions, error } = await supabase
      .from("financial_transactions")
      .select("id, description, amount, direction, due_date, paid_at, is_reconciled")
      .eq("financial_account_id", accountId)
      .eq("status", "PAID")
      .eq("is_reconciled", false)
      .gte("paid_at", startDate)
      .lte("paid_at", endDate + "T23:59:59")
      .order("paid_at", { ascending: true });

    if (error) throw error;

    // Build prompt for AI matching
    const prompt = `Você é um assistente de conciliação bancária. Analise as transações do extrato bancário (OFX) e as transações do sistema, e sugira correspondências.

TRANSAÇÕES DO EXTRATO BANCÁRIO (OFX):
${JSON.stringify(ofxTransactions, null, 2)}

TRANSAÇÕES DO SISTEMA (não conciliadas):
${JSON.stringify(systemTransactions, null, 2)}

Para cada transação do OFX, encontre a correspondência mais provável no sistema baseado em:
1. Valor exato ou muito próximo (considere que OFX usa negativo para débitos)
2. Data próxima (até 5 dias de diferença)
3. Descrição similar

Retorne um JSON array com o seguinte formato para cada transação OFX:
{
  "ofxFitId": "ID da transação OFX",
  "systemTransactionId": "ID da transação do sistema ou null se não encontrar",
  "confidence": número de 0 a 100 indicando confiança do match,
  "reason": "Explicação breve do motivo do match ou por que não encontrou"
}

IMPORTANTE: 
- Débitos no OFX (valores negativos) correspondem a direction="PAY" no sistema
- Créditos no OFX (valores positivos) correspondem a direction="RECEIVE" no sistema
- Compare os valores absolutos
- Retorne APENAS o JSON array, sem texto adicional`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "Você é um assistente especializado em conciliação bancária. Sempre retorne respostas em formato JSON válido.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";

    // Parse AI response
    let matches: any[] = [];
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", aiContent);
      matches = [];
    }

    // Build full match suggestions with transaction details
    const suggestions: MatchSuggestion[] = ofxTransactions.map((ofx: OFXTransaction) => {
      const match = matches.find((m: any) => m.ofxFitId === ofx.fitId);
      const systemTx = match?.systemTransactionId
        ? systemTransactions?.find((t) => t.id === match.systemTransactionId) || null
        : null;

      return {
        ofxTransaction: ofx,
        systemTransaction: systemTx,
        confidence: match?.confidence || 0,
        reason: match?.reason || "Nenhuma correspondência encontrada pela IA",
      };
    });

    return new Response(
      JSON.stringify({ suggestions, systemTransactions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("reconcile-bank-statement error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

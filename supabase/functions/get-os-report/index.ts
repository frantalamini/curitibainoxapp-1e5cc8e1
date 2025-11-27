import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("get-os-report Edge Function starting");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request to get OS report");

    // Parse request body
    const { osNumber } = await req.json();
    console.log("OS Number requested:", osNumber);

    if (!osNumber) {
      console.error("OS number not provided");
      return new Response(
        JSON.stringify({ error: "Número da OS não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase Admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("Fetching service call data for OS:", osNumber);

    // Fetch service call by os_number
    const { data: serviceCall, error: fetchError } = await supabaseAdmin
      .from("service_calls")
      .select(`
        os_number,
        report_pdf_path,
        status,
        scheduled_date,
        equipment_description,
        clients (
          full_name,
          phone
        )
      `)
      .eq("os_number", osNumber)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching service call:", fetchError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar ordem de serviço" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!serviceCall) {
      console.log("Service call not found for OS:", osNumber);
      return new Response(
        JSON.stringify({ error: "Ordem de serviço não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!serviceCall.report_pdf_path) {
      console.log("Report PDF path not found for OS:", osNumber);
      return new Response(
        JSON.stringify({ error: "Relatório não disponível para esta OS" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating signed URL for path:", serviceCall.report_pdf_path);

    // Generate signed URL (valid for 1 hour)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("service-call-attachments")
      .createSignedUrl(serviceCall.report_pdf_path, 3600);

    if (signedError || !signedData) {
      console.error("Error generating signed URL:", signedError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar URL de acesso ao PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully generated signed URL for OS:", osNumber);

    // Return OS data and PDF URL
    return new Response(
      JSON.stringify({
        osNumber: serviceCall.os_number,
        clientName: (serviceCall.clients as any)?.full_name,
        clientPhone: (serviceCall.clients as any)?.phone,
        equipmentDescription: serviceCall.equipment_description,
        scheduledDate: serviceCall.scheduled_date,
        status: serviceCall.status,
        pdfUrl: signedData.signedUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in get-os-report:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { corsHeaders } from "../_shared/cors.ts";

console.log("get-os-report Edge Function starting");

// Generic error message for all failure scenarios (prevents information leakage)
const GENERIC_ERROR = "Relatório indisponível";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request to get OS report");

    // Parse request body
    const { osNumber, token } = await req.json();
    console.log("OS Number requested:", osNumber);

    // Validate required fields - return generic error
    if (!osNumber || !token) {
      console.error("Missing osNumber or token");
      return new Response(
        JSON.stringify({ error: GENERIC_ERROR }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("Fetching service call data for OS:", osNumber);

    // Fetch ONLY minimum required fields - no PII
    const { data: serviceCall, error: fetchError } = await supabaseAdmin
      .from("service_calls")
      .select(`
        os_number,
        report_pdf_path,
        report_access_token,
        report_token_expires_at,
        equipment_description
      `)
      .eq("os_number", osNumber)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching service call:", fetchError);
      return new Response(
        JSON.stringify({ error: GENERIC_ERROR }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service call not found - return generic error (don't reveal if OS exists)
    if (!serviceCall) {
      console.log("Service call not found for OS:", osNumber);
      return new Response(
        JSON.stringify({ error: GENERIC_ERROR }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate access token - return generic error
    if (serviceCall.report_access_token !== token) {
      console.log("Invalid access token for OS:", osNumber);
      return new Response(
        JSON.stringify({ error: GENERIC_ERROR }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token expiration
    if (serviceCall.report_token_expires_at) {
      const expiresAt = new Date(serviceCall.report_token_expires_at);
      if (expiresAt < new Date()) {
        console.log("Token expired for OS:", osNumber);
        return new Response(
          JSON.stringify({ error: GENERIC_ERROR }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // PDF not available - return generic error
    if (!serviceCall.report_pdf_path) {
      console.log("Report PDF path not found for OS:", osNumber);
      return new Response(
        JSON.stringify({ error: GENERIC_ERROR }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        JSON.stringify({ error: GENERIC_ERROR }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully generated signed URL for OS:", osNumber);

    // Return ONLY minimum data - no PII (no client name, phone, email, etc.)
    return new Response(
      JSON.stringify({
        osNumber: serviceCall.os_number,
        equipmentDescription: serviceCall.equipment_description,
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
      JSON.stringify({ error: GENERIC_ERROR }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
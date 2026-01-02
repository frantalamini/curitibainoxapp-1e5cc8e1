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

    // SECURITY: Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado - token não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create authenticated Supabase client to verify user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Não autorizado - sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Check if user has admin or technician role (authorized to view reports)
    const { data: userRoles, error: rolesError } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("Error checking user roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasAccess = userRoles?.some(
      (r) => r.role === "admin" || r.role === "technician"
    );

    if (!hasAccess) {
      console.error("User lacks required role. User ID:", user.id);
      return new Response(
        JSON.stringify({ error: "Acesso negado - permissão insuficiente" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authorized with appropriate role");

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

    // Create Supabase Admin client (bypasses RLS) - only after authorization verified
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
        technician_id,
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

    // Additional authorization: technicians can only access their own service calls
    const isAdmin = userRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      // For technicians, verify they are assigned to this service call
      const { data: technician } = await supabaseAdmin
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!technician || technician.id !== serviceCall.technician_id) {
        console.error("Technician not authorized for this OS. User:", user.id, "OS technician:", serviceCall.technician_id);
        return new Response(
          JSON.stringify({ error: "Acesso negado - você não está atribuído a esta OS" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

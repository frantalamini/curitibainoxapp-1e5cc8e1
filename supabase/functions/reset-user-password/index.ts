import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação com cliente regular
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError);
      throw new Error("Não autorizado");
    }

    console.log("Verificando role de admin para usuário:", user.id);

    // Cliente admin para operações privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verificar se o usuário tem role de admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !userRole) {
      console.error("Usuário não é admin:", roleError);
      throw new Error("Apenas administradores podem resetar senhas");
    }

    // Pegar dados da requisição
    const { userId, newPassword } = await req.json();

    console.log("Resetando senha para usuário:", userId);

    // Validar senha forte
    if (newPassword.length < 8) {
      throw new Error("A senha deve ter no mínimo 8 caracteres");
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error("A senha deve conter pelo menos uma letra maiúscula");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      throw new Error("A senha deve conter pelo menos um caractere especial");
    }

    // Alterar a senha usando Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Erro ao atualizar senha:", error);
      throw error;
    }

    console.log("Senha alterada com sucesso para usuário:", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Senha alterada com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Erro ao resetar senha:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

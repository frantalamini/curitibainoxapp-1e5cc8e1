import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.curitibainoxapp.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with anon key to verify the calling user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Verify the calling user is an admin
    const {
      data: { user: callingUser },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !callingUser) {
      console.error("Error getting user:", userError);
      throw new Error("Unauthorized");
    }

    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);

    if (rolesError || !roles?.some((r) => r.role === "admin")) {
      console.error("User is not admin:", callingUser.id);
      throw new Error("Unauthorized: Admin access required");
    }

    // Parse request body
    const { username, email, password, full_name, phone, role } =
      await req.json();

    // Validate input
    if (!username || !email || !password || !full_name) {
      throw new Error(
        "Missing required fields: username, email, password, full_name",
      );
    }

    // Validate username format (letters, numbers, underscore, dot only)
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(username)) {
      throw new Error(
        "Username can only contain letters, numbers, underscore and dot",
      );
    }

    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }

    // Validate strong password
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error("Password must contain at least one uppercase letter");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error("Password must contain at least one special character");
    }

    if (!["admin", "technician"].includes(role)) {
      throw new Error("Invalid role. Must be admin or technician");
    }

    // Check if username or email already exists
    const supabaseCheck = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: existingUsername, error: usernameCheckError } =
      await supabaseCheck
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single();

    if (existingUsername) {
      throw new Error("Nome de usuário já existe");
    }

    // Se email já existe, desativar o usuário antigo e liberar o email
    // (rotatividade de técnicos — mesmo email pode ser reutilizado, histórico preservado)
    const { data: existingUsers, error: emailCheckError } =
      await supabaseCheck.auth.admin.listUsers();

    const oldUser = existingUsers?.users?.find((u) => u.email === email);
    if (oldUser) {
      console.log("Email já existe, desativando usuário antigo:", oldUser.id);

      // Trocar o email do usuário antigo para liberar (prefixo desativado_ + timestamp)
      const deactivatedEmail = `desativado_${Date.now()}_${email}`;
      const { error: updateError } =
        await supabaseCheck.auth.admin.updateUserById(oldUser.id, {
          email: deactivatedEmail,
          ban_duration: "876000h", // banir permanentemente (~100 anos) para impedir login
        });

      if (updateError) {
        console.error("Erro ao desativar usuário antigo:", updateError);
        throw new Error("Erro ao liberar email do usuário anterior");
      }

      // Atualizar email no profile também para manter consistência
      await supabaseCheck
        .from("profiles")
        .update({ email: deactivatedEmail })
        .eq("user_id", oldUser.id);

      // Remover roles para garantir que não consiga logar com permissões
      await supabaseCheck.from("user_roles").delete().eq("user_id", oldUser.id);

      console.log("Usuário antigo desativado, email liberado para reuso");
    }

    console.log("Creating user with email:", email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Create the user using admin API
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          phone: phone || "",
          username,
        },
      });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log("User created successfully:", newUser.user.id);

    // Criar profile diretamente (trigger handle_new_user não existe)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: newUser.user.id,
        user_id: newUser.user.id,
        full_name,
        phone: phone || "",
        username,
        email,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Failed to create user profile");
    }

    console.log("Profile created successfully");

    // Atribuir role
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: role,
    });

    if (roleError) {
      console.error("Error adding role:", roleError);
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Failed to assign role to user");
    }

    console.log("Role assigned successfully");

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        message: "User created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in create-user function:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred while creating user";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});

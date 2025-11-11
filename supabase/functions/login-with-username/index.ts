import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username_or_email, password } = await req.json();

    if (!username_or_email || !password) {
      throw new Error('Username/email and password are required');
    }

    // Create Supabase admin client for username lookup (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create regular client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let emailToUse = username_or_email;

    // Check if input is not an email (no @ symbol), then search for username
    if (!username_or_email.includes('@')) {
      console.log('Searching for username:', username_or_email);
      
      // Use admin client to bypass RLS policies on profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('username', username_or_email)
        .single();

      if (profileError || !profile) {
        console.error('Username not found:', profileError);
        throw new Error('Invalid credentials');
      }

      emailToUse = profile.email;
      console.log('Found email for username:', emailToUse);
    }

    // Attempt to sign in with email and password
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailToUse,
      password: password,
    });

    if (error) {
      console.error('Login error:', error);
      throw new Error('Invalid credentials');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        session: data.session,
        user: data.user
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in login-with-username function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting baseado em memória
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function getClientIP(req: Request): string {
  // Supabase Edge Functions usam x-forwarded-for para o IP real
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Pode conter múltiplos IPs separados por vírgula, pegar o primeiro
    return forwarded.split(',')[0].trim();
  }
  // Fallback para outros headers comuns
  return req.headers.get('x-real-ip') || 
         req.headers.get('cf-connecting-ip') || 
         'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  // Limpar registro expirado
  if (record && now > record.resetAt) {
    rateLimitMap.delete(ip);
  }
  
  const currentRecord = rateLimitMap.get(ip);
  
  // Novo IP - criar registro
  if (!currentRecord) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  
  // Verificar se excedeu o limite
  if (currentRecord.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((currentRecord.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  
  // Incrementar contador
  currentRecord.count++;
  return { allowed: true };
}

// Limpeza periódica de registros expirados (a cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar rate limit antes de processar
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.',
          retryAfterSeconds: rateLimitResult.retryAfterSeconds
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfterSeconds)
          },
          status: 429
        }
      );
    }

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
        success: false,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autorizado')
    }

    // Verificar se é admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado')
    }

    console.log('[delete-user] Verificando role do usuário:', user.id)

    // Verificar se tem role admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    if (rolesError) {
      console.error('[delete-user] Erro ao buscar roles:', rolesError)
      throw new Error('Erro ao verificar permissões')
    }

    const isAdmin = roles?.some(r => r.role === 'admin')
    if (!isAdmin) {
      throw new Error('Apenas administradores podem deletar usuários')
    }

    console.log('[delete-user] Usuário é admin, processando requisição')

    const { user_id } = await req.json()

    if (!user_id) {
      throw new Error('user_id é obrigatório')
    }

    // Impedir que admin delete a si mesmo
    if (user_id === user.id) {
      throw new Error('Você não pode deletar seu próprio usuário')
    }

    console.log('[delete-user] Deletando usuário:', user_id)

    // Deletar o usuário
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

    if (deleteError) {
      console.error('[delete-user] Erro ao deletar usuário:', deleteError)
      throw deleteError
    }

    console.log('[delete-user] Usuário deletado com sucesso:', user_id)

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[delete-user] Erro:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  'https://nacionallibertariobiobio.cl',
  'https://www.nacionallibertariobiobio.cl',
  'https://pnl-biobio.netlify.app',
]

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+-pnl-biobio\.netlify\.app$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const ADMIN_ROLES = ['super_admin', 'admin', 'admin_usuarios']

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar que el llamador es administrador
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado: falta token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('auth_id', callerUser.id)
      .maybeSingle()

    if (!callerProfile || !ADMIN_ROLES.includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Acceso denegado: se requiere rol administrativo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('userId es requerido')
    }

    console.log(`Iniciando eliminación completa para usuario: ${userId}`)

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error borrando de Auth:', authDeleteError)
      throw authDeleteError
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('auth_id', userId)

    if (profileError) {
      console.error('Error borrando de Profiles:', profileError)
    }

    console.log(`Usuario ${userId} eliminado exitosamente de Auth y Profiles`)

    return new Response(
      JSON.stringify({ success: true, message: 'Usuario eliminado completamente' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error en delete-user-complete:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

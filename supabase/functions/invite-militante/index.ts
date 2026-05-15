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
    const supabaseClient = createClient(
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
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const { data: callerProfile } = await supabaseClient
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

    const { email } = await req.json()

    if (!email) {
      throw new Error('Email es requerido')
    }

    const { data, error } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://nacionallibertariobiobio.cl/forja-login.html'
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Invitación enviada con éxito', data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

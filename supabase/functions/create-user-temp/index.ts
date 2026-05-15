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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

    const body = await req.json()
    console.log('[CreateUser] Procesando:', body.email)

    const { full_name, email, role, rut, phone_number, birth_date, comuna } = body

    if (!email || !full_name) throw new Error("Email y Nombre son obligatorios")

    // Generar contraseña aleatoria
    const randomChars = Math.random().toString(36).slice(-4) + Math.random().toString(36).toUpperCase().slice(-4)
    const tempPassword = `PNL-${randomChars}`

    let userId: string
    let isNew = false

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, rut }
    })

    if (createAuthError) {
      if (createAuthError.status === 422 || createAuthError.message.includes('already registered')) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('auth_id').eq('email', email).maybeSingle()

        if (prof) {
          userId = prof.auth_id
        } else {
          const { data: { user }, error: getError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
          if (getError || !user) {
            throw new Error(`Auth Error (${createAuthError.status}): ${createAuthError.message}. Lookup failed: ${getError?.message}`)
          }
          userId = user.id
        }
      } else {
        console.error(`[CreateUser] Auth Fail: ${createAuthError.status} - ${createAuthError.message}`)
        throw new Error(`Auth Fail (${createAuthError.status}): ${createAuthError.message}`)
      }
    } else {
      userId = authData.user.id
      isNew = true
    }

    const profileData: any = {
      auth_id: userId,
      full_name,
      email,
      role: role || 'normal'
    }

    if (rut) profileData.rut = String(rut).trim().substring(0, 20)
    if (phone_number) profileData.phone_number = String(phone_number).trim().substring(0, 30)

    if (birth_date) {
      const d = new Date(birth_date)
      if (!isNaN(d.getTime())) {
        profileData.birth_date = birth_date
      } else {
        console.warn(`[CreateUser] Fecha inválida ignorada: ${birth_date}`)
      }
    }

    if (comuna) profileData.comuna = String(comuna).trim().substring(0, 100)

    if (isNew) {
      profileData.must_change_password = true
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'auth_id' })

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ success: true, tempPassword, isNew, user: { full_name, email, role, phone_number } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('[CreateUser] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

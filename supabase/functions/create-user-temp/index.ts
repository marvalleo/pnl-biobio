import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!)

    const body = await req.json()
    console.log('[CreateUser] Procesando:', body.email)
    
    const { full_name, email, role, rut, phone_number, birth_date, comuna } = body

    if (!email || !full_name) throw new Error("Email y Nombre son obligatorios")

    // 1. Generar contraseña aleatoria (Segura y simple: Alfanumérica con símbolos)
    const randomChars = Math.random().toString(36).slice(-4) + Math.random().toString(36).toUpperCase().slice(-4);
    const tempPassword = `PNL-${randomChars}`;

    // 2. Intentar crear usuario en Auth
    let userId: string
    let isNew = false

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, rut }
    })

    if (authError) {
      // 422: User already registered. This is handled as an existing user.
      if (authError.status === 422 || authError.message.includes('already registered')) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('auth_id').eq('email', email).maybeSingle()
        
        if (prof) {
          userId = prof.auth_id
        } else {
          const { data: { user }, error: getError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
          
          if (getError || !user) {
             throw new Error(`Auth Error (${authError.status}): ${authError.message}. Lookup failed: ${getError?.message}`)
          }
          userId = user.id
        }
      } else {
        // Log deep auth error before throwing to catch rate limits (429) or other platform issues
        console.error(`[CreateUser] Auth Fail: ${authError.status} - ${authError.message}`);
        throw new Error(`Auth Fail (${authError.status}): ${authError.message}`);
      }
    } else {
      userId = authData.user.id
      isNew = true
    }

    // 3. Preparar objeto de Perfil (Upsert inteligente)
    // Solo incluimos campos opcionales si vienen con información para no borrar datos existentes
    const profileData: any = {
      auth_id: userId,
      full_name,
      email,
      role: role || 'normal'
    }

    if (rut) profileData.rut = String(rut).trim().substring(0, 20)
    if (phone_number) profileData.phone_number = String(phone_number).trim().substring(0, 30)
    
    // Validación estricta de fecha para evitar errores de Postgres 22008 / 22007
    if (birth_date) {
      const d = new Date(birth_date)
      if (!isNaN(d.getTime())) {
        profileData.birth_date = birth_date
      } else {
        console.warn(`[CreateUser] Fecha inválida ignorada: ${birth_date}`)
      }
    }
    
    if (comuna) profileData.comuna = String(comuna).trim().substring(0, 100)
    
    // Solo forzar cambio de password si es un usuario totalmente nuevo
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
    console.error('[CreateUser] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})

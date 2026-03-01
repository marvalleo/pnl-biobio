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

    const { full_name, email, role, rut, phone_number } = await req.json()

    if (!email || !full_name) throw new Error("Email y Nombre son obligatorios")

    // 1. Generar contraseña aleatoria (Segura y simple)
    const tempPassword = `PNL-${Math.random().toString(36).slice(-6).toUpperCase()}`

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
      // Si el error es que ya existe, lo buscamos para obtener su ID
      if (authError.message.includes('already registered') || authError.status === 422) {
        // Buscamos en la tabla de perfiles primero (es más rápido y sin paginación de Auth)
        const { data: prof } = await supabaseAdmin.from('profiles').select('auth_id').eq('email', email).maybeSingle()
        
        if (prof) {
          userId = prof.auth_id
        } else {
          // Si no está en perfiles, lo buscamos en Auth (paginando si es necesario)
          const { data: { users }, error: lError } = await supabaseAdmin.auth.admin.listUsers()
          if (lError) throw lError
          const u = users.find(user => user.email?.toLowerCase() === email.toLowerCase())
          if (!u) throw new Error(`El usuario ya existe en Auth pero no se pudo recuperar su ID.`)
          userId = u.id
        }
      } else {
        throw authError
      }
    } else {
      userId = authData.user.id
      isNew = true
    }

    // 3. Upsert Perfil (Role y Progress)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        auth_id: userId,
        full_name,
        rut: rut || null,
        email,
        phone_number: phone_number || null,
        role: role || 'normal',
        must_change_password: isNew
      }, { onConflict: 'auth_id' })

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ success: true, tempPassword, isNew, user: { full_name, email, role, phone_number } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})

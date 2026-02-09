import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Manejo de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Inicio de create-user-temp")

    // Verificar variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
      throw new Error("Error de configuración del servidor (Environment Variables)")
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Parsear body
    let userData
    try {
      userData = await req.json()
    } catch (e) {
      console.error("Error parseando JSON:", e)
      throw new Error("Body inválido o vacío")
    }

    const { full_name, rut, email, phone_number, role } = userData
    console.log(`Intentando crear usuario: ${email}, RUT: ${rut}`)

    if (!email || !rut) {
      throw new Error("Email y RUT son obligatorios")
    }

    // 1. Generar contraseña temporal
    const tempPassword = `PNL-${rut.replace('-', '').slice(-5)}`

    // 2. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, rut }
    })

    if (authError) {
      console.error("Error Auth createUser:", authError)
      throw authError
    }

    if (!authData.user) {
      console.error("Auth createUser no retornó usuario")
      throw new Error("Error inesperado al crear usuario en Auth")
    }

    console.log(`Usuario Auth creado: ${authData.user.id}`)

    // 3. Crear perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        auth_id: authData.user.id,
        full_name,
        rut,
        email,
        phone_number,
        role: role || 'normal',
        must_change_password: true
      }])

    if (profileError) {
      console.error("Error creando perfil:", profileError)
      // Intentar rollback (borrar usuario de auth si falló el perfil)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Error creando perfil: ${profileError.message}`)
    }

    console.log("Perfil creado exitosamente")

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        user: { 
          id: authData.user.id,
          full_name, 
          rut, 
          email, 
          phone_number, 
          role 
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error("Error capturado en catch final:", error)
    
    // Devolvemos 400 en lugar de 500 para errores controlados, para que el frontend pueda leer el mensaje
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error desconocido en el servidor',
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

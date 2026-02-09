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
    console.log("Inicio de create-user-temp v2 (Upsert Fix)")

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
    console.log(`Intentando crear usuario: ${email}, RUT: ${rut || 'N/A'}`)

    if (!email) {
      throw new Error("El Email es obligatorio")
    }

    // 1. Generar contraseña temporal
    // Priorizamos RUT si existe, si no, usamos parte del email + random
    let tempPassword;
    if (rut && rut.trim() !== '') {
      tempPassword = `PNL-${rut.replace('-', '').slice(-5)}`;
    } else {
      const emailPrefix = email.split('@')[0].slice(0, 4).toUpperCase();
      const randomSuffix = Math.random().toString(36).slice(-4).toUpperCase();
      tempPassword = `PNL-${emailPrefix}${randomSuffix}`;
    }

    // 2. Crear usuario en Supabase Auth
    // Al crear el usuario, el TRIGGER de la base de datos se disparará automáticamente
    // y creará un perfil básico en 'public.profiles'.
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

    // 3. Completar/Actualizar perfil (Upsert)
    // Usamos UPSERT para manejar dos casos:
    // A) El trigger creó el perfil: Lo actualizamos con los datos extra (role, must_change_password)
    // B) El trigger falló o no existe: Lo creamos desde cero.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        auth_id: authData.user.id, // Llave única para el upsert
        full_name,
        rut,
        email,
        phone_number,
        role: role || 'normal',
        must_change_password: true
      }, { onConflict: 'auth_id' }) // Importante: especificar la columna de conflicto

    if (profileError) {
      console.error("Error actualizando perfil:", profileError)
      // Intentar rollback (borrar usuario de auth si falló el perfil)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Error actualizando perfil: ${profileError.message}`)
    }

    console.log("Perfil actualizado exitosamente")

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
    console.error("Error capturado:", error)
    
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const userData = await req.json()
    const { full_name, rut, email, phone_number, role } = userData

    // 1. Generar contraseña temporal
    const tempPassword = `PNL-${rut.replace('-', '').slice(-5)}`

    // 2. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, rut }
    })

    if (authError) throw authError

    // 3. Crear perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        auth_id: authData.user.id,
        full_name,
        rut,
        email,
        phone_number,
        role,
        must_change_password: true
      }])

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        user: { full_name, rut, email, phone_number, role }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

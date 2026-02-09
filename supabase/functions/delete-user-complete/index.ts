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

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('userId es requerido')
    }

    console.log(`Iniciando eliminación completa para usuario: ${userId}`)

    // 1. Eliminar de Auth (esto debería borrar Profiles por cascada si está configurado, 
    // pero lo haremos explícito para asegurar limpieza)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('Error borrando de Auth:', authError)
      throw authError
    }

    // 2. Intentar borrar de Profiles explícitamente (por si acaso no hay cascada)
    // Nota: Si ya se borró por cascada, esto podría no afectar filas, lo cual está bien.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('auth_id', userId)

    if (profileError) {
      console.error('Error borrando de Profiles:', profileError)
      // No lanzamos error aquí porque lo principal (Auth) ya se borró
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

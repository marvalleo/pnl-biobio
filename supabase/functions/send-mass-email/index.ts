import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'PNL Biobío <comunicaciones@nacionallibertariobiobio.cl>'

serve(async (req: Request) => {
  // 1. Manerjar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Extraer Título y Contenido
    const { subject, bodyHtml, target_audience, offset = 0 } = await req.json()

    if (!subject || !bodyHtml) {
      throw new Error('Asunto y contenido son requeridos')
    }

    // 3. Obtener Usuario desde el Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado: Falta token')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) throw new Error('Sesión inválida')

    // 4. Validar Rol de Super Admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (profileError || profile?.role !== 'super_admin') {
      throw new Error('Prohibido: Se requiere rol de Super Administrador')
    }

    // 5. Obtener TODOS los Destinatarios (Manejando el límite de 1000 de Supabase)
    let allEmails: string[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = (page * pageSize) + (offset || 0)
      const to = from + pageSize - 1

      const query = supabaseClient
        .from('profiles')
        .select('email')
        .range(from, to)
      
      if (target_audience === 'admins') {
        query.neq('role', 'normal')
      }

      const { data: recipients, error: recError } = await query
      if (recError) throw recError

      if (recipients && recipients.length > 0) {
        const pageEmails = recipients.map(r => r.email).filter(Boolean) as string[]
        allEmails = [...allEmails, ...pageEmails]
        
        if (recipients.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }
    }

    const emails = allEmails
    if (emails.length === 0) {
      return new Response(JSON.stringify({ message: 'No hay destinatarios encontrados' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // 6. Registrar Campaña en DB
    const { data: campaign, error: campError } = await supabaseClient
      .from('email_campaigns')
      .insert({
        subject,
        body_html: bodyHtml,
        target_audience: target_audience || 'all',
        status: 'sending',
        total_recipients: emails.length,
        sent_by: user.id
      })
      .select()
      .single()

    if (campError) throw campError

    // 7. Enviar via Resend (Batch API)
    const batchSize = 100
    let successCount = 0
    let failCount = 0
    const errors: any[] = []

    for (let i = 0; i < emails.length; i += batchSize) {
      // Throttling: Si no es el primer lote, esperamos 250ms para no saturar las 5 req/s de Resend
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 250))
      }

      const chunk = emails.slice(i, i + batchSize)
      const batchData = chunk.map(email => ({
        from: FROM_EMAIL,
        to: [email],
        subject: subject,
        html: bodyHtml,
      }))

      try {
        const res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(batchData),
        })

        const resData = await res.json()
        if (!res.ok) throw new Error(resData.message || 'Error en Resend Batch')
        
        successCount += chunk.length
      } catch (err) {
        failCount += chunk.length
        errors.push(err.message)
      }
    }

    // 8. Actualizar Estado de Campaña
    await supabaseClient
      .from('email_campaigns')
      .update({
        status: failCount === 0 ? 'completed' : (successCount > 0 ? 'completed' : 'failed'),
        total_sent: successCount,
        total_failed: failCount,
        sent_at: new Date().toISOString(),
        error_log: errors
      })
      .eq('id', campaign.id)

    return new Response(
      JSON.stringify({ 
        message: 'Proceso completado', 
        sent: successCount, 
        failed: failCount,
        campaignId: campaign.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

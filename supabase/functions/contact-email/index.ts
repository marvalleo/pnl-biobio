import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://nacionallibertariobiobio.cl',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, comuna, message } = await req.json()

    if (!name || !email || !message) {
      throw new Error('Nombre, email y mensaje son requeridos')
    }

    if (String(name).length > 200 || String(email).length > 200 ||
        String(message).length > 5000 || String(comuna || '').length > 200) {
      throw new Error('Datos exceden la longitud permitida')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PNL Biobío <onboarding@resend.dev>',
        to: ['directivapnlbiobio.regional@gmail.com'],
        subject: `Nuevo mensaje de contacto: ${escapeHtml(String(name).substring(0, 100))}`,
        html: `
          <h1>Nuevo mensaje desde la web PNL Biobío</h1>
          <p><strong>Nombre:</strong> ${escapeHtml(String(name))}</p>
          <p><strong>Email:</strong> ${escapeHtml(String(email))}</p>
          <p><strong>Comuna:</strong> ${escapeHtml(String(comuna || ''))}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space:pre-wrap">${escapeHtml(String(message))}</p>
        `,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

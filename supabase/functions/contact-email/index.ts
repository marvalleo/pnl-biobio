import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// --- CORS: orígenes permitidos (apex + www + previews Netlify + localhost) ---
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

// --- Rate limit (S-04) ---
const RATE_LIMIT = 5        // máximo de envíos permitidos...
const WINDOW_MINUTES = 60   // ...por esta ventana de tiempo (por IP)

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

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

    // Validación básica de formato de email (servidor)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      throw new Error('El correo no tiene un formato válido')
    }

    // --- S-04: Rate-limit por IP (server-side, no manipulable por el cliente) ---
    const ipRaw = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const ip = ipRaw.split(',')[0].trim()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const sinceIso = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count, error: countErr } = await supabase
      .from('contact_rate_limit')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', sinceIso)

    // Si el conteo falla, no bloqueamos el contacto legítimo (fail-open controlado),
    // pero registramos el intento igual para no perder la protección por completo.
    if (!countErr && (count ?? 0) >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: 'Has enviado demasiados mensajes. Por favor, intenta nuevamente en una hora.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Registrar este envío
    await supabase.from('contact_rate_limit').insert({ ip })

    // Limpieza ocasional de registros viejos (>24h) para mantener la tabla pequeña
    if (Math.random() < 0.1) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('contact_rate_limit').delete().lt('created_at', dayAgo)
    }

    // --- Envío del correo vía Resend ---
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
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

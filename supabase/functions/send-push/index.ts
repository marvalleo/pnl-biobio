import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { configureVapid, sendToSubscriptions } from "../_shared/web-push.ts"

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
    'https://nacionallibertariobiobio.cl',
    'https://www.nacionallibertariobiobio.cl',
    'https://pnl-biobio.netlify.app',
]

function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get('origin') ?? ''
    const allowed = ALLOWED_ORIGINS.includes(origin) ||
        /^https:\/\/[a-z0-9-]+-pnl-biobio\.netlify\.app$/.test(origin) ||
        /^http:\/\/localhost(:\d+)?$/.test(origin)
    return {
        'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

const ADMIN_ROLES = ['super_admin', 'admin']

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
    const cors = getCorsHeaders(req)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

    try {
        // Leer secrets VAPID
        const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
        const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
        const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') ?? ''

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
            return new Response(JSON.stringify({ error: 'Faltan secrets VAPID' }), {
                status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verificar que el llamador es admin
        const authHeader = req.headers.get('authorization')
        if (!authHeader) return new Response(JSON.stringify({ error: 'Sin autorización' }), {
            status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
        })

        const token = authHeader.replace(/^Bearer\s+/i, '')
        const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
        if (authErr || !caller) return new Response(JSON.stringify({ error: 'Token inválido' }), {
            status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
        })

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('auth_id', caller.id)
            .maybeSingle()

        if (!profile || !ADMIN_ROLES.includes(profile.role)) {
            return new Response(JSON.stringify({ error: 'Requiere rol admin' }), {
                status: 403, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        const body = await req.json()
        const { title, message, url = '/', topic = 'pnl-general' } = body

        if (!title || !message) throw new Error('title y message son requeridos')

        // Obtener suscripciones activas
        const { data: subs, error: subsErr } = await supabaseAdmin
            .from('push_subscriptions')
            .select('id, endpoint, keys_p256dh, keys_auth')
            .eq('is_active', true)

        if (subsErr) throw new Error(`Error al obtener suscripciones: ${subsErr.message}`)
        if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({ sent: 0, message: 'Sin suscriptores activos' }), {
                status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        configureVapid(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, `mailto:${VAPID_EMAIL}`)
        const { sent, failed, expiredIds } = await sendToSubscriptions(subs, {
            title, body: message, url, tag: topic, icon: '/assets/images/logos/pnl-del-biobio01.webp'
        })

        // Limpiar suscripciones expiradas (410/404)
        if (expiredIds.length > 0) {
            const { error: deactivateErr } = await supabaseAdmin
                .from('push_subscriptions')
                .update({ is_active: false })
                .in('id', expiredIds)
            if (deactivateErr) console.error('[send-push] Error al desactivar suscripciones:', deactivateErr.message)
            else console.log(`[send-push] Marcadas inactivas: ${expiredIds.length}`)
        }

        // Registrar en log
        const { error: logErr } = await supabaseAdmin.from('push_notifications_log').insert({
            title, body: message, url, sent_by: caller.id,
            target_audience: 'all', total_sent: sent, total_failed: failed
        })
        if (logErr) console.error('[send-push] Error al registrar el envio:', logErr.message)

        return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
            status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('[send-push] Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
    }
})

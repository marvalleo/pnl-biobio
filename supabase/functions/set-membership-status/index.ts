import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

const VALID_STATUSES = ['activo', 'inactivo', 'suspendido', 'baja']
// ~100 anios: efectivamente permanente hasta que se reactive al militante.
const BAN_DURATION = '876000h'

serve(async (req: Request) => {
    const cors = getCorsHeaders(req)
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status, headers: { ...cors, 'Content-Type': 'application/json' }
    })

    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

    try {
        const authHeader = req.headers.get('authorization')
        if (!authHeader) return json({ error: 'Sin autorización' }, 401)

        const url = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAdmin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        const token = authHeader.replace(/^Bearer\s+/i, '')
        const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
        if (authErr || !caller) return json({ error: 'Token inválido' }, 401)

        // Misma autorización que admin_list_profiles, evaluada con el JWT del llamador.
        const supabaseUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: { headers: { Authorization: authHeader } },
        })
        const { data: isAdmin, error: rpcErr } = await supabaseUser.rpc('is_admin_usuarios')
        if (rpcErr) return json({ error: 'No se pudo verificar permisos' }, 500)
        if (isAdmin !== true) return json({ error: 'Requiere permisos de administrador de usuarios' }, 403)

        const body = await req.json().catch(() => null)
        const profileId = body?.profile_id
        const status = body?.status
        if (typeof profileId !== 'string' || !profileId) return json({ error: 'profile_id requerido' }, 400)
        if (!VALID_STATUSES.includes(status)) return json({ error: 'status inválido' }, 400)

        const { data: target, error: targetErr } = await supabaseAdmin
            .from('profiles')
            .select('id, auth_id')
            .eq('id', profileId)
            .maybeSingle()
        if (targetErr) return json({ error: 'Error al buscar el perfil' }, 500)
        if (!target) return json({ error: 'Perfil no encontrado' }, 404)

        if (target.auth_id === caller.id) {
            return json({ error: 'No puedes cambiar tu propio estado' }, 403)
        }

        // Una baja sin cuenta de acceso no se puede bloquear: si luego se vinculara una cuenta,
        // entraria sin ban. Se rechaza en vez de guardar un estado que no se cumple.
        if (!target.auth_id && status === 'baja') {
            return json({ error: 'El perfil no tiene cuenta de acceso; no se puede dar de baja' }, 400)
        }

        // Primero el bloqueo de acceso y solo si resulta se guarda el estado: si falla, el estado
        // anterior queda intacto y reintentar es seguro (ban/unban es idempotente).
        if (target.auth_id) {
            const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(target.auth_id, {
                ban_duration: status === 'baja' ? BAN_DURATION : 'none',
            })
            if (banErr) {
                console.error('set-membership-status ban error:', banErr.message)
                return json({ error: 'No se pudo actualizar el bloqueo de acceso; el estado no cambió' }, 500)
            }
        }

        const { error: updErr } = await supabaseAdmin
            .from('profiles')
            .update({ membership_status: status })
            .eq('id', profileId)
        if (updErr) {
            console.error('set-membership-status update error:', updErr.message)
            const detail = status === 'baja'
                ? 'el acceso ya quedó bloqueado, reintenta para guardar la baja'
                : 'el acceso ya quedó habilitado, reintenta para guardar el estado'
            return json({ error: `No se pudo guardar el estado (${detail})` }, 500)
        }

        return json({ ok: true, status })
    } catch (err) {
        console.error('set-membership-status error:', err)
        return json({ error: 'Error interno' }, 500)
    }
})

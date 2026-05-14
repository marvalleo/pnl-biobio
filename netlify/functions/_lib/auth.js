const { createClient } = require('@supabase/supabase-js');

let _supabaseAdmin = null;
function getSupabaseAdmin() {
    if (!_supabaseAdmin) {
        const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
        }
        _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
    return _supabaseAdmin;
}

function decodeJwtSub(token) {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) throw new Error('Token malformado');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expirado');
    }
    if (!payload.sub) throw new Error('Token sin campo sub');
    return payload.sub;
}

/**
 * Valida el JWT del header Authorization y devuelve el perfil del usuario.
 * Resuelve a { profile, supabase } o lanza error con statusCode embebido.
 *
 * Uso típico desde un handler de Netlify:
 *   try {
 *       const { profile, supabase } = await authenticate(event);
 *       // ... lógica con profile.id
 *   } catch (err) {
 *       return { statusCode: err.statusCode || 500,
 *                body: JSON.stringify({ ok: false, message: err.message }) };
 *   }
 */
async function authenticate(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
        const e = new Error('No autorizado: falta token');
        e.statusCode = 401;
        throw e;
    }

    let userId;
    try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        userId = decodeJwtSub(token);
    } catch (jwtErr) {
        const e = new Error(`Token inválido: ${jwtErr.message}`);
        e.statusCode = 401;
        throw e;
    }

    const supabase = getSupabaseAdmin();
    const byAuthId = await supabase
        .from('profiles')
        .select('id, role, accepted_forum_rules, full_name')
        .eq('auth_id', userId)
        .maybeSingle();

    let profile = byAuthId.data;
    if (!profile) {
        const byId = await supabase
            .from('profiles')
            .select('id, role, accepted_forum_rules, full_name')
            .eq('id', userId)
            .maybeSingle();
        profile = byId.data;
    }

    if (!profile) {
        const e = new Error('Perfil no encontrado para el token entregado');
        e.statusCode = 403;
        throw e;
    }

    return { profile, supabase, authUserId: userId };
}

module.exports = { authenticate, getSupabaseAdmin };

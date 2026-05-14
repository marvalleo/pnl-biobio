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
    // JWTs use base64url (no padding, '-' instead of '+', '_' instead of '/').
    // Node 16+ supports 'base64url' as encoding.
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expirado');
    }
    if (!payload.sub) throw new Error('Token sin campo sub');
    return payload.sub;
}

/**
 * Valida el JWT del header Authorization y devuelve el perfil del usuario.
 * Resuelve a { profile, supabase, authUserId } o lanza error con statusCode embebido.
 *
 * IMPORTANTE - Trust model:
 *   - El JWT NO se verifica criptográficamente (no validamos la firma). Confiamos
 *     en que cualquier `sub` que aparezca en el token corresponde a un perfil real
 *     en la tabla profiles. Si alguien fabrica un token con un sub arbitrario,
 *     no encontraremos perfil y devolveremos 403.
 *   - El cliente `supabase` retornado usa SERVICE_ROLE_KEY y bypasea RLS.
 *     Úsalo solo para operaciones que genuinamente lo requieran (insertar en
 *     tablas con RLS deny, leer información cross-user para procesamiento).
 *     NO uses este cliente como sustituto de las queries normales del usuario.
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
        // No exponemos jwtErr.message al cliente; podría contener fragmentos del payload.
        console.error('[auth] JWT decode error:', jwtErr.message);
        const e = new Error('Token inválido o expirado');
        e.statusCode = 401;
        throw e;
    }

    const supabase = getSupabaseAdmin();
    const byAuthId = await supabase
        .from('profiles')
        .select('id, role, accepted_forum_rules, full_name')
        .eq('auth_id', userId)
        .maybeSingle();

    if (byAuthId.error) {
        console.error('[auth] Supabase error (byAuthId):', byAuthId.error.message);
        const e = new Error('Error consultando perfil de usuario');
        e.statusCode = 500;
        throw e;
    }

    let profile = byAuthId.data;
    if (!profile) {
        const byId = await supabase
            .from('profiles')
            .select('id, role, accepted_forum_rules, full_name')
            .eq('id', userId)
            .maybeSingle();
        if (byId.error) {
            console.error('[auth] Supabase error (byId):', byId.error.message);
            const e = new Error('Error consultando perfil de usuario');
            e.statusCode = 500;
            throw e;
        }
        profile = byId.data;
    }

    if (!profile) {
        const e = new Error('No autorizado');
        e.statusCode = 403;
        throw e;
    }

    return { profile, supabase, authUserId: userId };
}

module.exports = { authenticate, getSupabaseAdmin };

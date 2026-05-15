const { createClient } = require('@supabase/supabase-js');

let _supabaseAdmin = null;
let _supabaseVerifier = null;

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

function getSupabaseVerifier() {
    if (!_supabaseVerifier) {
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY para verificación JWT');
        }
        _supabaseVerifier = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _supabaseVerifier;
}

/**
 * Valida el JWT del header Authorization y devuelve el perfil del usuario.
 * Resuelve a { profile, supabase, authUserId } o lanza error con statusCode embebido.
 *
 * IMPORTANTE - Trust model:
 *   - El JWT se verifica criptográficamente via supabase.auth.getUser(token),
 *     que valida la firma contra el servidor de Supabase Auth.
 *   - El cliente `supabase` retornado usa SERVICE_ROLE_KEY y bypasea RLS.
 *     Úsalo solo para operaciones que genuinamente lo requieran.
 *
 * Uso típico:
 *   try {
 *       const { profile, supabase } = await authenticate(event);
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

    const token = authHeader.replace(/^Bearer\s+/i, '');

    let userId;
    try {
        const verifier = getSupabaseVerifier();
        const { data: { user }, error } = await verifier.auth.getUser(token);
        if (error || !user) {
            const e = new Error('Token inválido o expirado');
            e.statusCode = 401;
            throw e;
        }
        userId = user.id;
    } catch (jwtErr) {
        if (jwtErr.statusCode) throw jwtErr;
        console.error('[auth] JWT verify error');
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

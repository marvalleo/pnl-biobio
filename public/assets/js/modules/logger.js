/**
 * logic for logging events and errors to the database
 */

export async function logSystemEvent(eventType, level = 'info', message = "", metadata = {}) {
    if (!window.supabaseClient || !window.isSupabaseInit) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        let profileId = null;

        if (user) {
            // Intentar obtener de sessionStorage primero
            const cachedProfile = JSON.parse(sessionStorage.getItem('pnl_profile'));
            if (cachedProfile) {
                profileId = cachedProfile.id;
            } else {
                // Si no, buscarlo (esto puede ser lento pero es para asegurar el log)
                const { data: p } = await window.supabaseClient.from('profiles').select('id').eq('auth_id', user.id).single();
                if (p) profileId = p.id;
            }
        }

        const logData = {
            profile_id: profileId,
            event_type: eventType,
            level: level,
            message: message,
            metadata: metadata,
            user_agent: navigator.userAgent,
            page_url: window.location.href
        };

        const { error } = await window.supabaseClient.from('system_logs').insert(logData);
        if (error) console.warn("Fallo al registrar log en DB:", error.message);
    } catch (err) {
        console.error("Error en logger:", err);
    }
}

export async function logError(message, context = {}, errorObj = null) {
    const metadata = { 
        context,
        error_name: errorObj?.name,
        error_stack: errorObj?.stack?.substring(0, 500) // Limitar tamaño del stack
    };
    return logSystemEvent('error', 'error', message, metadata);
}

export async function logSecurity(message, metadata = {}) {
    return logSystemEvent('security', 'warning', message, metadata);
}

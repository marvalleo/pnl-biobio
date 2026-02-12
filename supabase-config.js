// 1. Netlify Snippets (Producción) | 2. LocalStorage (Desarrollo) | 3. Hardcoded (No recomendado)
const SUPABASE_URL = window.supabaseUrl || localStorage.getItem('SUPABASE_URL') || "";
const SUPABASE_ANON_KEY = window.supabaseKey || localStorage.getItem('SUPABASE_ANON_KEY') || "";

// Stubs para evitar errores de 'undefined' si Supabase falla al cargar
window.supabaseClient = {
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signOut: async () => ({ error: null })
    },
    from: () => ({
        select: () => ({
            eq: () => ({
                single: async () => ({ data: null, error: null }),
                order: async () => ({ data: [], error: null }),
                match: () => ({ single: async () => ({ data: null, error: null }) })
            }),
            order: async () => ({ data: [], error: null }),
            match: () => ({ single: async () => ({ data: null, error: null }) }),
            insert: async () => ({ data: null, error: null }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
            delete: () => ({ eq: async () => ({ data: null, error: null }) })
        })
    }),
    channel: () => ({
        on: () => ({ subscribe: () => { } }),
        subscribe: () => { }
    })
};

window.isSupabaseInit = false;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        // Si llegamos aquí, el cliente se creó (aunque la red pueda fallar luego)
        window.supabaseClient = client;
        window.isSupabaseInit = true;
        console.log("✅ Supabase inicializado correctamente.");
    } catch (err) {
        console.error("❌ Error crítico inicializando Supabase Client:", err);
    }
} else {
    console.warn("⚠️ Advertencia: No se encontraron credenciales de Supabase.");
}

if (window.isSupabaseInit) {
    // --- GESTIÓN DE SESIÓN Y SEGURIDAD ---
    const INACTIVITY_LIMIT = 30 * 60 * 1000;

    let inactivityTimer;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(async () => {
            if (supabaseClient) {
                const { error } = await supabaseClient.auth.signOut();
                if (!error) {
                    window.location.href = 'forja-login.html';
                }
            }
        }, INACTIVITY_LIMIT);
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
                window.addEventListener(evt, resetInactivityTimer, true);
            });
            resetInactivityTimer();
        }
    });
}

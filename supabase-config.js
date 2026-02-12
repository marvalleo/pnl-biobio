// 1. Netlify Snippets (Producción) | 2. LocalStorage (Desarrollo) | 3. Fallback Seguro
const SUPABASE_URL = window.supabaseUrl || localStorage.getItem('SUPABASE_URL') || "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_ANON_KEY = window.supabaseKey || localStorage.getItem('SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTMyNjgsImV4cCI6MjA4NjAyOTI2OH0.UEziql_VLY92Opgngmf-LBEYmFzduVMKFcwEviV99NE";

window.isSupabaseInit = false;

// Stubs iniciales para evitar errores inmediatos si la red es lenta
window.supabaseClient = {
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: async () => {
            const reason = typeof supabase === 'undefined' ? "El SDK de Supabase no ha cargado (posible bloqueo de red)." : "Credenciales inválidas o error de red.";
            return { data: { user: null }, error: { message: `No se puede iniciar sesión: ${reason}` } };
        },
        signOut: async () => ({ error: null })
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), order: async () => ({ data: [], error: null }) }) }) })
};

async function initSupabase() {
    let retryCount = 0;
    while (typeof supabase === 'undefined' && retryCount < 10) {
        console.warn("Esperando SDK de Supabase...");
        await new Promise(r => setTimeout(r, 500));
        retryCount++;
    }

    if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.isSupabaseInit = true;
            console.log("✅ Supabase inicializado correctamente.");

            // Re-disparar configuración de sesión una vez cargado
            setupSessionManagement();
        } catch (err) {
            console.error("❌ Error crítico inicializando Supabase Client:", err);
        }
    } else {
        console.error("❌ No se pudo cargar Supabase. Verifica la conexión y credenciales.");
    }
}

function setupSessionManagement() {
    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    let inactivityTimer;

    const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(async () => {
            if (window.supabaseClient && window.isSupabaseInit) {
                await window.supabaseClient.auth.signOut();
                window.location.href = 'forja-login.html';
            }
        }, INACTIVITY_LIMIT);
    };

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
                window.addEventListener(evt, resetInactivityTimer, true);
            });
            resetInactivityTimer();
        }
    });
}

// Arrancar inicialización
initSupabase();

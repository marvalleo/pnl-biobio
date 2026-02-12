// --- CONFIGURACIÓN DE CREDENCIALES ---
const FALLBACK_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTMyNjgsImV4cCI6MjA4NjAyOTI2OH0.UEziql_VLY92Opgngmf-LBEYmFzduVMKFcwEviV99NE";

function getCleanConfig() {
    let url = window.supabaseUrl || localStorage.getItem('SUPABASE_URL');
    let key = window.supabaseKey || localStorage.getItem('SUPABASE_ANON_KEY');

    // Función de validación estricta
    const isValidUrl = (u) => u && typeof u === 'string' && u.trim().startsWith('http') && u.length > 15;
    const isValidKey = (k) => k && typeof k === 'string' && k.trim().length > 50 && !k.includes(' ');

    // Limpiar cache si hay basura
    if (url && !isValidUrl(url)) {
        console.warn("⚠️ URL inválida en cache, limpiando...");
        localStorage.removeItem('SUPABASE_URL');
        url = null;
    }
    if (key && !isValidKey(key)) {
        console.warn("⚠️ Anon Key inválida en cache, limpiando...");
        localStorage.removeItem('SUPABASE_ANON_KEY');
        key = null;
    }

    // Aplicar fallbacks finales (usando los del .env proporcionado)
    url = url || FALLBACK_URL;
    key = key || FALLBACK_KEY;

    return { url: url.trim(), key: key.trim() };
}

window.isSupabaseInit = false;
window.supabaseClient = null;

async function startSupabase() {
    const { url, key } = getCleanConfig();

    // Esperar al SDK (Max 5s)
    let attempts = 0;
    while (typeof supabase === 'undefined' && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }

    if (typeof supabase !== 'undefined') {
        try {
            window.supabaseClient = supabase.createClient(url, key);
            window.isSupabaseInit = true;
            console.log("✅ Supabase conectado.");
            setupSessionManagement();
        } catch (err) {
            setupStub(`Error en createClient: ${err.message}`);
        }
    } else {
        setupStub("El SDK de Supabase no cargó después de 5 segundos.");
    }
}

function setupStub(errorMsg) {
    console.error("❌ Fallo Supabase:", errorMsg);
    window.supabaseClient = {
        auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => ({
                data: { user: null },
                error: { message: `ERROR CRÍTICO: ${errorMsg}. Por favor, contacta a soporte.` }
            }),
            signOut: async () => ({ error: null })
        },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), order: async () => ({ data: [], error: null }) }) }) })
    };
}

function setupSessionManagement() {
    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    let timer;
    const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            if (window.isSupabaseInit && window.supabaseClient) {
                await window.supabaseClient.auth.signOut();
                window.location.href = 'forja-login.html';
            }
        }, INACTIVITY_LIMIT);
    };
    if (window.supabaseClient) {
        window.supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session) {
                ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(e => window.addEventListener(e, reset, true));
                reset();
            }
        });
    }
}

startSupabase();

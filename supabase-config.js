// --- CONFIGURACIÓN DE CREDENCIALES ---
// Prioridad: 1. Snippets Netlify | 2. LocalStorage | 3. Hardcoded Fallback
function getSupabaseConfig() {
    const windowUrl = window.supabaseUrl;
    const windowKey = window.supabaseKey;

    // Validar que no sean strings literales "undefined" o vacíos
    const url = (windowUrl && windowUrl !== "undefined" && windowUrl.length > 10) ? windowUrl :
        (localStorage.getItem('SUPABASE_URL') || "https://kjcwozzfzbizxurppxlf.supabase.co");

    const key = (windowKey && windowKey !== "undefined" && windowKey.length > 50) ? windowKey :
        (localStorage.getItem('SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTMyNjgsImV4cCI6MjA4NjAyOTI2OH0.UEziql_VLY92Opgngmf-LBEYmFzduVMKFcwEviV99NE");

    return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } = getSupabaseConfig();
window.isSupabaseInit = false;

// --- INICIALIZACIÓN ---
async function startSupabase() {
    console.log("🚀 Iniciando conexión con Supabase...");

    // 1. Esperar al SDK si aún no está (máximo 3 segundos)
    let checks = 0;
    while (typeof supabase === 'undefined' && checks < 6) {
        await new Promise(r => setTimeout(r, 500));
        checks++;
    }

    if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            window.isSupabaseInit = true;
            console.log("✅ Supabase conectado exitosamente.");
            setupSessionManagement();
        } catch (err) {
            console.error("❌ Error de creación del cliente:", err);
            activateStub("Error interno de inicialización.");
        }
    } else {
        const reason = (typeof supabase === 'undefined') ? "SDK no disponible" : "Faltan credenciales";
        console.error(`❌ Fallo en inicialización: ${reason}`);
        activateStub(reason);
    }
}

function activateStub(reason) {
    window.supabaseClient = {
        auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => ({
                data: { user: null },
                error: { message: `Sistema fuera de línea: ${reason}. Por favor, recarga la página.` }
            }),
            signOut: async () => ({ error: null })
        },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), order: async () => ({ data: [], error: null }) }) }) })
    };
}

function setupSessionManagement() {
    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    let inactivityTimer;
    const reset = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(async () => {
            if (window.isSupabaseInit) {
                await window.supabaseClient.auth.signOut();
                window.location.href = 'forja-login.html';
            }
        }, INACTIVITY_LIMIT);
    };

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => window.addEventListener(evt, reset, true));
            reset();
        }
    });
}

// Ejecutar inmediatamente
startSupabase();

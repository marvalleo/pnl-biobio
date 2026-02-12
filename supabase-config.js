// Configuración de Supabase - Carga dinámica
// Primero intentamos sacar de window (inyectado por Netlify)
// Si no están, intentamos usar valores quemados si existieran (fallback seguro)
const SUPABASE_URL = window.supabaseUrl || "";
const SUPABASE_ANON_KEY = window.supabaseKey || "";

let supabaseClient;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase inicializado correctamente.");
    } catch (err) {
        console.error("❌ Error crítico inicializando Supabase Client:", err);
    }
} else {
    console.warn("⚠️ Advertencia: No se encontraron credenciales de Supabase en 'window'.");
    console.log("Si estás en Netlify, verifica el Snippet Injection. Si estás en Local, el snippet no se inyecta automáticamente.");
}

// --- GESTIÓN DE SESIÓN Y SEGURIDAD ---
const INACTIVITY_LIMIT = 30 * 60 * 1000;

let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (!error) {
            window.location.href = 'forja-login.html';
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

// Configuración de Supabase - Carga dinámica desde Snippets de Netlify
const url = window.supabaseUrl;
const key = window.supabaseKey;

// Inicializar el cliente
if (!url || !key) {
    console.error("❌ Error: No se encontraron las credenciales de Supabase en window.supabaseUrl/Key.");
}
const supabaseClient = supabase.createClient(url, key);

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

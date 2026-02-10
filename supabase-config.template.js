// Configuración de Supabase para PNL Biobío (Template)
const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

// Inicializar el cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

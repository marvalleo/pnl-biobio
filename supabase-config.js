// Configuración de Supabase para PNL Biobío
const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SNZ9Np8K8sq9MG1x9OMolQ_-ry_Uoc5";

// Inicializar el cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- GESTIÓN DE SESIÓN Y SEGURIDAD ---
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutos
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(async () => {
        console.warn("Sesión expirada por inactividad.");
        const { error } = await supabaseClient.auth.signOut();
        if (!error) {
            alert("Tu sesión ha expirado por inactividad. Por favor, inicia sesión de nuevo.");
            window.location.href = 'forja-login.html';
        }
    }, INACTIVITY_LIMIT);
}

// Monitorear actividad (solo si hay una sesión activa)
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        // Reiniciar timer en eventos comunes
        ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
            window.addEventListener(evt, resetInactivityTimer, true);
        });
        resetInactivityTimer();
    } else {
        // Limpiar eventos si no hay sesión
        ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
            window.removeEventListener(evt, resetInactivityTimer, true);
        });
    }
});

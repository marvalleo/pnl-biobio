// Configuración de Supabase para PNL Biobío
const SUPABASE_URL = "https://kjcwozzfzbizxurppxlf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqY3dvenpmemJpenh1cnBweGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTMyNjgsImV4cCI6MjA4NjAyOTI2OH0.UEziql_VLY92Opgngmf-LBEYmFzduVMKFcwEviV99NE";

// Inicializar el cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- GESTIÓN DE SESIÓN Y SEGURIDAD ---
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos
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

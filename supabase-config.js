// --- CONFIGURACIÓN DE CREDENCIALES ---
// Vite reemplaza import.meta.env durante el build. Si no hay variables, FALLBACK será ""
const FALLBACK_URL = import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.SUPABASE_URL || "";
const FALLBACK_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || import.meta.env?.SUPABASE_ANON_KEY || "";

// --- VALIDACIÓN DE ORÍGENES (Chile / Local) ---
const ALLOWED_ORIGINS = [
    'localhost',
    '127.0.0.1',
    'pnl-biobio.netlify.app',
    'nacionallibertariobiobio.cl',
    'nacionalllibertariobiobio.cl', // Soporte para typo común (3 Ls)
    'pnlbiobio.cl'
];

function isOriginAllowed() {
    const hostname = window.location.hostname.toLowerCase();
    // Permite Netlify deploys previews
    if (hostname.includes('pnl-biobio') && hostname.includes('netlify.app')) return true;
    // Permite el dominio oficial y sus variaciones (Case insensitive y flexible con Ls)
    if (hostname.includes('nacionallibertario') || hostname.includes('nacionalllibertario') || hostname.includes('pnlbiobio.cl')) return true;
    return ALLOWED_ORIGINS.includes(hostname);
}

function getCleanConfig() {
    // 1. Prioridad: Window (Inyectado por script manual si el build falla)
    // 2. Cache: LocalStorage (Configurado por el botón de error)
    // 3. Fallback: Variables de entorno (Vite)
    let url = window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL');
    let key = window.SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY');

    const isValidUrl = (u) => u && typeof u === 'string' && u.trim().startsWith('http') && u.length > 15;
    const isValidKey = (k) => k && typeof k === 'string' && k.trim().length > 50;

    // Limpiar basura del cache
    if (url && !isValidUrl(url)) {
        console.warn("[Supabase] URL en cache no es válida.");
        localStorage.removeItem('SUPABASE_URL');
        url = null;
    }
    if (key && !isValidKey(key)) {
        console.warn("[Supabase] Key en cache no es válida.");
        localStorage.removeItem('SUPABASE_ANON_KEY');
        key = null;
    }

    url = url || FALLBACK_URL;
    key = key || FALLBACK_KEY;

    return { 
        url: url ? url.trim() : "", 
        key: key ? key.trim() : "" 
    };
}

window.isSupabaseInit = false;
window.supabaseClient = null;

async function startSupabase() {
    // 1. Verificar origen
    if (!isOriginAllowed()) {
        console.error("⛔ SEGURIDAD: Origen no autorizado:", window.location.hostname);
        setupStub("Origen no autorizado por política de seguridad.");
        return;
    }

    const { url, key } = getCleanConfig();

    if (!url || !key) {
        setupStub("Faltan las credenciales de Supabase (URL o KEY). Verifica tu archivo .env o la configuración en Netlify.");
        return;
    }

    // 2. Esperar a que el SDK global esté cargado (si se incluyó por script)
    let attempts = 0;
    while (typeof supabase === 'undefined' && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }

    if (typeof supabase !== 'undefined') {
        try {
            window.supabaseClient = supabase.createClient(url, key);
            window.isSupabaseInit = true;
            console.log("✅ Supabase inicializado correctamente.");
            setupSessionManagement();
        } catch (err) {
            setupStub(`Error en createClient: ${err.message}`);
        }
    } else {
        // 3. Intento de carga dinámica si falla el script tag
        console.warn("[Supabase] SDK no encontrado, intentando carga dinámica...");
        try {
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
            window.supabaseClient = createClient(url, key);
            window.isSupabaseInit = true;
            console.log("✅ Supabase inicializado vía ESM.");
            setupSessionManagement();
        } catch (dynamicErr) {
            setupStub("No se pudo cargar el SDK de Supabase (Global ni ESM).");
        }
    }
}

function setupStub(errorMsg) {
    console.error("❌ Fallo crítico en Supabase:", errorMsg);
    window.supabaseClient = {
        auth: {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => ({
                data: { user: null },
                error: { message: `ERROR: ${errorMsg}` }
            }),
            signOut: async () => ({ error: null })
        },
        from: () => ({ 
            select: () => ({ 
                eq: () => ({ 
                    single: async () => ({ data: null, error: null }),
                    order: async () => ({ data: [], error: null })
                }) 
            }) 
        })
    };
}

function setupSessionManagement() {
    const INACTIVITY_LIMIT = 45 * 60 * 1000; // 45 minutos para militantes
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

// Iniciar proceso
startSupabase();


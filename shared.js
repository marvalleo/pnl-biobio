/**
 * shared.js - Lógica común para la plataforma Forja Biobío
 * Incluye gestión de Navbar, Notificaciones (Toasts) y Auth helpers.
 */

// --- SISTEMA DE NOTIFICACIONES (TOASTS) ---
function showToast(message, type = 'info') {
    // Eliminar toast anterior si existe
    const existingToast = document.getElementById('pnl-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'pnl-toast';

    // Estilos base
    const baseClasses = "fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl font-900 text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all duration-500 opacity-0 translate-y-10";

    // Colores según tipo
    const types = {
        success: "bg-green-500 text-white",
        error: "bg-red-600 text-white",
        info: "bg-[#0f172a] text-white",
        warning: "bg-[#fba931] text-[#0f172a]"
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };

    toast.className = `${baseClasses} ${types[type] || types.info}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined text-lg">${icons[type] || 'info'}</span>
        ${message}
    `;

    document.body.appendChild(toast);

    // Animación de entrada
    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translate(-50%, 0)";
    }, 10);

    // Auto-eliminar
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translate(-50%, 20px)";
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Reemplazar alert nativo (opcional, pero mejor llamar a showToast directamente)
// window.alert = (msg) => showToast(msg, 'info');

// --- GESTIÓN DE NAVBAR Y MENÚ DE USUARIO ---
async function initNavbar() {
    if (!window.isSupabaseInit) {
        console.warn("initNavbar: Supabase no está configurado.");
        if (!document.getElementById('pnl-config-warning')) {
            const warning = document.createElement('div');
            warning.id = 'pnl-config-warning';
            warning.className = "fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase py-2 px-4 shadow-xl z-[9000] text-center flex justify-center items-center gap-4";
            warning.innerHTML = `
                <span>⚠️ Error de Configuración: Supabase no detectado en Local</span>
                <button onclick="localStorage.setItem('SUPABASE_URL', prompt('URL Supabase:')); localStorage.setItem('SUPABASE_ANON_KEY', prompt('Anon Key:')); location.reload();" 
                        class="bg-white text-red-600 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors">
                    Configurar Ahora
                </button>
            `;
            document.body.appendChild(warning);
        }
        return;
    }

    const navContainer = document.getElementById('user-menu-container');
    const adminLink = document.getElementById('admin-link-container');
    if (!navContainer) return;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        // ... (resto igual)

        // Intentar obtener de sessionStorage primero para optimizar
        let profile = JSON.parse(sessionStorage.getItem('pnl_profile'));

        if (!profile) {
            const { data } = await supabaseClient.from('profiles').select('full_name, role').eq('auth_id', user.id).single();
            profile = data;
            if (profile) sessionStorage.setItem('pnl_profile', JSON.stringify(profile));
        }

        const fullName = profile?.full_name || user.user_metadata?.full_name || user.email || 'Miembro';
        const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        // Mostrar link a administración si es admin
        if (adminLink && ['super_admin', 'admin_forja', 'admin_votos', 'admin_foros', 'admin_usuarios'].includes(profile?.role)) {
            adminLink.classList.remove('hidden');
        }

        navContainer.innerHTML = `
            <div class="relative">
                <button onclick="toggleUserMenu()" class="w-10 h-10 rounded-full bg-[#fba931] text-[#0f172a] font-900 text-xs border-2 border-white shadow-sm hover:scale-105 transition-all flex items-center justify-center">
                    ${initials}
                </button>
                <div id="user-dropdown" class="hidden absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[100]">
                    <div class="px-5 py-3 border-b border-gray-50 mb-2">
                        <p class="text-[8px] font-black uppercase text-[#fba931] tracking-widest leading-none mb-1">Sesión Iniciada</p>
                        <p class="text-xs font-black text-[#0f172a] truncate">${fullName}</p>
                    </div>
                    <button onclick="logout()" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <span class="material-symbols-outlined text-lg">logout</span> Cerrar Sesión
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("Navbar init error:", err);
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

// Cerrar dropdown al hacer click fuera
window.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    const menuContainer = document.getElementById('user-menu-container');
    if (dropdown && !dropdown.classList.contains('hidden') && menuContainer && !menuContainer.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

async function logout() {
    if (window.supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// --- HELPERS DE VALIDACIÓN ---
function validateRUT(rut) {
    if (!rut) return false;
    let value = rut.replace(/\./g, '').replace(/-/g, '');
    if (value.length < 8) return false;

    let cuerpo = value.slice(0, -1);
    let dv = value.slice(-1).toUpperCase();

    let suma = 0;
    let multiplo = 2;

    for (let i = 1; i <= cuerpo.length; i++) {
        suma = suma + multiplo * value.charAt(cuerpo.length - i);
        if (multiplo < 7) multiplo = multiplo + 1; else multiplo = 2;
    }

    let dvEsperado = 11 - (suma % 11);
    dvEsperado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();

    return dv === dvEsperado;
}

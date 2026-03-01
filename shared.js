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
    try {
        if (window.isSupabaseInit && window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
    } catch (err) {
        console.warn("Error durante signOut de Supabase:", err);
    }

    // Limpieza total de almacenamiento
    localStorage.clear();
    sessionStorage.clear();

    // Redirigir siempre al inicio
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

// --- SISTEMA DE ANUNCIOS DE IMPACTO (MODALES) ---

/**
 * Muestra un modal de impacto premium
 * @param {Object} config - { title, content, image_url, cta_text, cta_url, id }
 */
function showImpactModal(config) {
    const { title, content, image_url, cta_text, cta_url, id } = config;

    // Evitar duplicados
    if (document.getElementById('impact-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'impact-modal-overlay';
    overlay.className = "fixed inset-0 bg-black/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4 opacity-0 transition-opacity duration-500 text-left";

    const modal = document.createElement('div');
    modal.className = "bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative translate-y-20 transition-transform duration-500 border border-white/20";

    const closeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    const arrowIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

    // Renderizado de bloque de imagen con log de depuración y fallback
    const imageBlock = image_url ? `
        <div class="h-64 sm:h-80 w-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
            <img src="${image_url}" 
                 id="impact-modal-img"
                 class="w-full h-full object-cover transition-opacity duration-700 opacity-0" 
                 onload="this.classList.remove('opacity-0'); console.log('PNL Image: Imagen cargada con éxito')"
                 onerror="handleModalImageError(this, '${image_url}')">
            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
            <!-- Spinner / Loader -->
            <div id="img-loader" class="absolute inset-0 flex items-center justify-center bg-slate-50">
                 <div class="w-8 h-8 border-4 border-[#fba931] border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>` : '<div class="h-10 bg-[#0f172a]"></div>';

    modal.innerHTML = `
        ${imageBlock}
        
        <button onclick="closeImpactModal('${id}', false)" 
                title="Cerrar por ahora"
                class="absolute top-6 right-6 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10">
            ${closeIcon}
        </button>

        <div class="p-8 sm:p-10 text-center">
            <h2 class="serif text-3xl sm:text-4xl text-[#0f172a] mb-6 leading-tight">${title}</h2>
            <div class="text-xs sm:text-sm text-gray-500 mb-8 leading-relaxed font-medium max-h-48 overflow-y-auto custom-scrollbar">
                ${content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>')}
            </div>
            
            <div class="flex flex-col gap-6 items-center">
                ${cta_url ? `
                <div class="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <a href="${cta_url}" target="_blank"
                       class="px-8 py-4 bg-[#fba931] text-[#0f172a] rounded-2xl font-900 text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-3 min-w-[140px]">
                        ${cta_text || 'Entrar al Enlace'} ${arrowIcon}
                    </a>
                </div>` : ''}

                ${(config.contact_email || config.contact_whatsapp) ? `
                <div class="flex flex-wrap items-center justify-center gap-4 border-t border-gray-100 pt-6 w-full mt-2">
                    ${config.contact_email ? `
                    <div class="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-left cursor-pointer hover:bg-slate-100 transition-colors active:scale-95" 
                         onclick="navigator.clipboard.writeText('${config.contact_email}'); const s = this.querySelector('.email-val'); const o = '${config.contact_email}'; s.innerText='¡Copiado al portapapeles!'; setTimeout(() => s.innerText=o, 2000);"
                         title="Clic para copiar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-gray-400 shrink-0" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <div>
                            <span class="block text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Copiar Correo</span>
                            <span class="email-val text-[11px] font-bold text-[#fba931]">${config.contact_email}</span>
                        </div>
                    </div>` : ''}

                    ${config.contact_whatsapp ? `
                    <a href="https://wa.me/${config.contact_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, me comunico por este anuncio: ' + title)}" target="_blank"
                       class="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-6 py-3 rounded-xl transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.4 8.38 8.38 0 0 1 3.9 1.1L21 4z"></path></svg>
                        <span class="text-[10px] font-black uppercase tracking-widest">Enviar WhatsApp</span>
                    </a>` : ''}
                </div>` : ''}
                
                <button onclick="closeImpactModal('${id}', true)" 
                        class="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors">
                    No volver a ver este anuncio
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animación de entrada
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        modal.classList.remove('translate-y-20');
        modal.classList.add('translate-y-0');
    }, 100);

    // Ocultar loader si hay imagen
    if (image_url) {
        const img = document.getElementById('impact-modal-img');
        const loader = document.getElementById('img-loader');
        if (img) {
            if (img.complete) {
                loader?.remove();
                img.classList.remove('opacity-0');
            } else {
                img.onload = () => {
                    loader?.remove();
                    img.classList.remove('opacity-0');
                    console.log("PNL Image: Imagen cargada (evento)");
                };
            }
        }
    }
}

function handleModalImageError(img, url) {
    console.error("PNL Image Error: No se pudo cargar la imagen", url);
    const parent = img.parentElement;
    const loader = document.getElementById('img-loader');
    loader?.remove();

    // Fallback: Mostrar gradiente estético con el logo o simplemente ocultar
    parent.innerHTML = `
        <div class="w-full h-full bg-[#0f172a] flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <span class="serif text-4xl text-white opacity-20 italic">PNL Biobío</span>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
        </div>
    `;
}

function closeImpactModal(id, permanent = false) {
    const overlay = document.getElementById('impact-modal-overlay');
    const modal = overlay?.querySelector('div');

    if (overlay && modal) {
        modal.classList.add('translate-y-20');
        overlay.classList.add('opacity-0');

        if (id) {
            if (permanent) {
                // Registrar permanentemente
                const viewed = JSON.parse(localStorage.getItem('pnl_viewed_announcements') || '[]');
                if (!viewed.includes(id)) {
                    viewed.push(id);
                    localStorage.setItem('pnl_viewed_announcements', JSON.stringify(viewed));
                }
                console.log("PNL Biobío: Anuncio descartado permanentemente.");
            } else {
                // Registrar solo para la sesión actual
                const sessionDismissed = JSON.parse(sessionStorage.getItem('pnl_session_dismissed') || '[]');
                if (!sessionDismissed.includes(id)) {
                    sessionDismissed.push(id);
                    sessionStorage.setItem('pnl_session_dismissed', JSON.stringify(sessionDismissed));
                }
                console.log("PNL Biobío: Anuncio cerrado por ahora (sesión).");
            }
        }

        setTimeout(() => overlay.remove(), 500);
    }
}

/**
 * Comprueba si hay anuncios activos y los muestra si no han sido vistos
 */
async function checkAndShowAnnouncements() {
    // Reintentar si Supabase no está listo (hasta 10 segundos para conexiones lentas)
    let attempts = 0;
    while (!window.isSupabaseInit && attempts < 20) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }

    if (!window.isSupabaseInit || !window.supabaseClient) {
        console.warn("Anuncios: Supabase no se inicializó a tiempo.");
        return;
    }

    try {
        console.log("PNL Biobío: Buscando anuncios activos...");
        const { data: announcement, error } = await supabaseClient
            .from('regional_announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!announcement) {
            console.log("PNL Biobío: No hay anuncios activos ahora mismo.");
            return;
        }

        console.log("PNL Biobío: Anuncio encontrado:", announcement.title);

        const isTestMode = window.location.search.includes('test=1');

        // Comprobar si ya se vio este anuncio específico
        const viewed = JSON.parse(localStorage.getItem('pnl_viewed_announcements') || '[]');
        if (viewed.includes(announcement.id) && !isTestMode) {
            console.log("PNL Biobío: El usuario ya vio este anuncio (Permanente). No se muestra.");
            return;
        }

        // Comprobar si se cerró en esta sesión
        const sessionDismissed = JSON.parse(sessionStorage.getItem('pnl_session_dismissed') || '[]');
        if (sessionDismissed.includes(announcement.id) && !isTestMode) {
            console.log("PNL Biobío: El anuncio fue cerrado en esta sesión. No se muestra.");
            return;
        }

        // Comprobar expiración
        if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) {
            console.log("PNL Biobío: El anuncio ha expirado.");
            return;
        }

        // Comprobar audiencia
        if (announcement.target_audience === 'militants') {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                console.log("PNL Biobío: Anuncio restringido a militantes (no logueado).");
                return;
            }
        }

        // Config de renderizado
        const configForModal = { ...announcement };

        // Mostrar con un pequeño delay
        console.log("PNL Biobío: Disparando modal de impacto...");
        setTimeout(() => showImpactModal(configForModal), 1500);

    } catch (err) {
        console.warn("Error al comprobar anuncios:", err);
    }
}

// Inicialización automática de anuncios corregida
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', checkAndShowAnnouncements);
} else {
    // Si ya cargó el DOM, ejecutar de inmediato (mientras espera a Supabase internamente)
    checkAndShowAnnouncements();
}

/**
 * 🔐 AUTH MODULE — PNL Biobío
 * Gestiona navbar del usuario, toggle de notificaciones push y badge de campanita.
 */

// Helper: ejecuta una promesa con timeout, retorna fallback si tarda demasiado
function withTimeout(promise, ms, fallback) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(fallback), ms))
    ]);
}

export async function initNavbar() {
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
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        // Obtener perfil (sessionStorage como caché)
        let profile = JSON.parse(sessionStorage.getItem('pnl_profile'));
        if (!profile) {
            const { data } = await window.supabaseClient.from('profiles').select('full_name, role').eq('auth_id', user.id).single();
            profile = data;
            if (profile) sessionStorage.setItem('pnl_profile', JSON.stringify(profile));
        }

        const fullName = profile?.full_name || user.user_metadata?.full_name || user.email || 'Miembro';
        const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        if (adminLink && ['super_admin', 'admin_forja', 'admin_votos', 'admin_foros', 'admin_usuarios'].includes(profile?.role)) {
            adminLink.classList.remove('hidden');
        }

        // Obtener estado push con timeout de 2s para no bloquear la carga del avatar
        let unreadCount = 0;
        let toggleOn = false;
        let permStatus = 'default';

        try {
            permStatus = typeof Notification !== 'undefined' ? Notification.permission : 'default';
            if (window.pushManager) {
                // Usar timeout para evitar que navigator.serviceWorker.ready bloquee
                const [cnt, subscribed] = await Promise.all([
                    withTimeout(window.pushManager.getUnreadCount(), 2000, 0),
                    withTimeout(window.pushManager.isSubscribed(), 2000, false)
                ]);
                unreadCount = cnt;
                toggleOn = permStatus === 'granted' && subscribed;
            }
        } catch (_) {
            // Push no disponible, continuar sin ello
        }

        const badgeHTML = unreadCount > 0
            ? `<span id="notif-badge" style="
                position:absolute; top:-4px; right:-4px;
                background:#ef4444; color:white;
                border-radius:9999px; width:18px; height:18px;
                font-size:9px; font-weight:900;
                display:flex; align-items:center; justify-content:center;
                border:2px solid white; line-height:1;
                pointer-events:none;
              ">${unreadCount > 9 ? '9+' : unreadCount}</span>`
            : '';

        const toggleHTML = buildToggleHTML(toggleOn, permStatus);

        navContainer.innerHTML = `
            <style>
                #push-toggle-thumb { transition: transform 0.2s ease; }
            </style>
            <div class="relative" id="user-menu-wrapper">
                <button id="user-avatar-btn"
                        style="position:relative; display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9999px; background:#fba931; color:#0f172a; font-size:11px; font-weight:900; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.15); cursor:pointer; flex-shrink:0;">
                    ${initials}
                    ${badgeHTML}
                </button>
                <div id="user-dropdown" class="hidden absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[100]"
                     style="min-width:240px;">
                    <div class="px-5 py-3 border-b border-gray-50 mb-2">
                        <p class="text-[8px] font-black uppercase text-[#fba931] tracking-widest leading-none mb-1">Sesión Iniciada</p>
                        <p class="text-xs font-black text-[#0f172a] truncate">${fullName}</p>
                    </div>
                    
                    <a href="perfil.html" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-[#0f172a] hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50">
                        <span class="material-symbols-outlined text-lg">admin_panel_settings</span> Mi Perfil / Privacidad
                    </a>

                    ${toggleHTML}

                    <button onclick="logout()" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <span class="material-symbols-outlined text-lg">logout</span> Cerrar Sesión
                    </button>
                </div>
            </div>
        `;

        // Event listener directo en el botón del avatar
        const avatarBtn = document.getElementById('user-avatar-btn');
        if (avatarBtn) {
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('user-dropdown');
                if (!dropdown) return;
                dropdown.classList.toggle('hidden');
                if (!dropdown.classList.contains('hidden')) {
                    const badge = document.getElementById('notif-badge');
                    if (badge) {
                        badge.style.transition = 'opacity 0.3s';
                        badge.style.opacity = '0';
                        setTimeout(() => badge.remove(), 300);
                    }
                    if (window.pushManager) window.pushManager.markAllAsRead();
                }
            });
        }

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('user-menu-wrapper');
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown && wrapper && !wrapper.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        // Vincular toggle
        bindPushToggle(toggleOn, permStatus);

    } catch (err) {
        console.error("Navbar init error:", err);
    }
}

function buildToggleHTML(isOn, permStatus) {
    const trackColor = isOn ? '#22c55e' : '#e2e8f0';
    const thumbPos = isOn ? 'translateX(18px)' : 'translateX(2px)';
    let statusText = 'Inactivo';
    let statusColor = '#94a3b8';
    if (isOn) { statusText = 'Activado'; statusColor = '#22c55e'; }
    else if (permStatus === 'denied') { statusText = 'Bloqueado en navegador'; statusColor = '#ef4444'; }

    return `
        <div class="px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="material-symbols-outlined text-lg text-gray-400 shrink-0">notifications</span>
                <div class="min-w-0">
                    <p class="text-[10px] font-black uppercase text-gray-700 leading-none mb-0.5">Notificaciones</p>
                    <p id="push-toggle-status" style="font-size:9px; font-weight:700; color:${statusColor}; margin:0; line-height:1.3;">${statusText}</p>
                </div>
            </div>
            <button id="push-toggle-btn"
                    style="width:40px; height:22px; border:none; cursor:${permStatus === 'denied' ? 'not-allowed' : 'pointer'}; border-radius:9999px; background:${trackColor}; position:relative; flex-shrink:0; padding:0; opacity:${permStatus === 'denied' ? '0.5' : '1'}; overflow:hidden;">
                <span id="push-toggle-thumb" style="position:absolute; top:2px; left:0; width:18px; height:18px; background:white; border-radius:9999px; box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:transform 0.2s ease; transform:${thumbPos};"></span>
            </button>
        </div>
    `;
}

function bindPushToggle(isCurrentlyOn, permStatus) {
    let toggleState = isCurrentlyOn;
    setTimeout(() => {
        const btn = document.getElementById('push-toggle-btn');
        if (!btn) return;
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            console.log('PNL Push: [MOBILE DEBUG] Toggle presionado.');
            console.log('PNL Push: Estado actual de variables -> toggleState:', toggleState, '| permStatus:', permStatus);

            if (permStatus === 'denied') {
                console.log('PNL Push: Permiso está denegado. Informando al usuario...');
                const st = document.getElementById('push-toggle-status');
                if (st) { st.textContent = 'Ve a Configuración del navegador'; st.style.color = '#f59e0b'; }
                return;
            }

            const track = document.getElementById('push-toggle-btn');
            const thumb = document.getElementById('push-toggle-thumb');
            const statusEl = document.getElementById('push-toggle-status');

            if (track) track.style.opacity = '0.5';

            try {
                if (toggleState) {
                    console.log('PNL Push: Intentando desuscribir...');
                    await window.pushManager.unsubscribe();
                    console.log('PNL Push: Desuscripción completada.');

                    if (thumb) thumb.style.transform = 'translateX(2px)';
                    if (track) { track.style.background = '#e2e8f0'; track.style.opacity = '1'; }
                    if (statusEl) { statusEl.textContent = 'Inactivo'; statusEl.style.color = '#94a3b8'; }
                    toggleState = false;
                } else {
                    console.log('PNL Push: Intentando solicitar permiso al usuario...');
                    const granted = await window.pushManager.requestPermission();
                    console.log('PNL Push: Resultado de solicitud de permiso:', granted);

                    if (granted) {
                        console.log('PNL Push: Permiso concedido, intentando suscribir al SW...');
                        const subResult = await window.pushManager.subscribe();
                        console.log('PNL Push: Resultado de la suscripción:', subResult ? 'Éxito' : 'Fallo');

                        if (subResult) {
                            if (thumb) thumb.style.transform = 'translateX(19px)';
                            if (track) { track.style.background = '#22c55e'; track.style.opacity = '1'; }
                            if (statusEl) { statusEl.textContent = 'Activado'; statusEl.style.color = '#22c55e'; }
                            toggleState = true;
                        } else {
                            console.error('PNL Push: Falló la suscripción silente (posible problema de VAPID o SW).');
                            if (track) track.style.opacity = '1';
                        }
                    } else {
                        console.log('PNL Push: El usuario denegó o cerró el prompt de permisos.');
                        if (track) track.style.opacity = '1';
                        if (statusEl) { statusEl.textContent = 'Permiso denegado'; statusEl.style.color = '#ef4444'; }
                    }
                }
            } catch (error) {
                console.error('PNL Push: Ocurrió una excepción durante el toggle:', error);
                if (track) track.style.opacity = '1';
            }
        });
    }, 0);
}

export async function logout() {
    try {
        if (window.isSupabaseInit && window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
    } catch (err) {
        console.warn("Error durante signOut de Supabase:", err);
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
}

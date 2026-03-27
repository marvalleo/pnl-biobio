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
                <span>⚠️ Error de Configuración: Conexión con Supabase no inicializada</span>
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

        let unreadCount = 0;
        let toggleOn = false;
        let permStatus = 'default';
        let isSupported = false;

        try {
            permStatus = typeof Notification !== 'undefined' ? Notification.permission : 'default';
            if (window.pushManager) {
                isSupported = window.pushManager.checkSupport();
                if (isSupported) {
                    // Usar timeout para evitar que navigator.serviceWorker.ready bloquee
                    const [cnt, subscribed] = await Promise.all([
                        withTimeout(window.pushManager.getUnreadCount(), 2000, 0),
                        withTimeout(window.pushManager.isSubscribed(), 2000, false)
                    ]);
                    unreadCount = cnt;
                    toggleOn = permStatus === 'granted' && subscribed;
                }
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

        const toggleHTML = buildToggleHTML(toggleOn, permStatus, isSupported);

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

                    <button id="show-notif-history-btn" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-blue-500 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b border-gray-50">
                        <span class="material-symbols-outlined text-lg">history</span> Bandeja de Entrada
                    </button>

                    <button id="show-pwa-logs-btn" class="hidden w-full text-left px-5 py-3 text-[10px] font-black uppercase text-indigo-500 hover:bg-indigo-50 items-center gap-3 transition-colors border-b border-gray-50">
                        <span class="material-symbols-outlined text-lg">bug_report</span> Ver Logs (Debug)
                    </button>

                    <button onclick="logout()" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <span class="material-symbols-outlined text-lg">logout</span> Cerrar Sesión
                    </button>
                </div>
            </div>
        `;

        // Función para actualizar el contador visual (globo rojo)
        window.updateUnreadCount = async () => {
            try {
                if (!window.supabaseClient) return;

                // 1. Obtener historial (mismos datos que el modal)
                const { data, error } = await window.supabaseClient.rpc('get_my_push_history', { max_records: 50 });
                if (error || !data) return;

                // 2. Obtener leídos desde la DB para el perfil actual
                const { data: profileData } = await window.supabaseClient.from('profiles').select('id').eq('auth_id', (await window.supabaseClient.auth.getUser()).data.user.id).single();
                if (!profileData) return;
                const profileId = profileData.id;

                const { data: readData, error: readError } = await window.supabaseClient
                    .from('notification_reads')
                    .select('notification_id')
                    .eq('profile_id', profileId);
                
                if (readError) throw readError;
                const readIds = (readData || []).map(r => r.notification_id);

                // 3. Calcular no leídos comparando con el historial
                const unread = data.filter(n => !readIds.includes(n.id)).length;

                // 4. Actualizar el DOM
                const avatarBtn = document.getElementById('user-avatar-btn');
                if (!avatarBtn) return;

                let badge = document.getElementById('notif-badge');

                if (unread > 0) {
                    const badgeText = unread > 9 ? '9+' : unread;
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.id = 'notif-badge';
                        badge.style.cssText = `
                            position:absolute; top:-4px; right:-4px;
                            background:#ef4444; color:white;
                            border-radius:9999px; width:18px; height:18px;
                            font-size:9px; font-weight:900;
                            display:flex; align-items:center; justify-content:center;
                            border:2px solid white; line-height:1;
                            pointer-events:none; transition: all 0.3s ease;
                        `;
                        avatarBtn.appendChild(badge);
                    }
                    badge.textContent = badgeText;
                    badge.style.opacity = '1';
                    badge.style.transform = 'scale(1)';
                } else if (badge) {
                    badge.style.opacity = '0';
                    badge.style.transform = 'scale(0.5)';
                    setTimeout(() => badge.remove(), 300);
                }
            } catch (err) {
                console.error("Error updating unread count:", err);
            }
        };

        // Event listener directo en el botón del avatar
        const avatarBtn = document.getElementById('user-avatar-btn');
        if (avatarBtn) {
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('user-dropdown');
                if (!dropdown) return;
                dropdown.classList.toggle('hidden');
                // Ya no borramos el badge al abrir el menú, el usuario quiere ver el contador hasta que lea las notificaciones
            });
        }

        // Ejecutar conteo inicial
        window.updateUnreadCount();

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('user-menu-wrapper');
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown && wrapper && !wrapper.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        // Vincular toggle
        bindPushToggle(toggleOn, permStatus, isSupported);

        // Vincular botón de historial
        const historyBtn = document.getElementById('show-notif-history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Ocultar dropdown al abrir
                const dropdown = document.getElementById('user-dropdown');
                if (dropdown) dropdown.classList.add('hidden');

                if (window.showNotificationHistory) window.showNotificationHistory();
            });
        }

        // Vincular botón de logs
        const logsBtn = document.getElementById('show-pwa-logs-btn');
        if (logsBtn) {
            logsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.showPWALogs) window.showPWALogs();
            });
        }

    } catch (err) {
        console.error("Navbar init error:", err);
    }
}

function buildToggleHTML(isOn, permStatus, isSupported = true) {
    const trackColor = isOn && isSupported ? '#22c55e' : '#e2e8f0';
    const thumbPos = isOn && isSupported ? 'translateX(18px)' : 'translateX(2px)';

    let statusText = 'Inactivo';
    let statusColor = '#94a3b8';
    let opacity = '1';
    let cursor = 'pointer';
    let title = isOn ? 'Desactivar notificaciones' : 'Activar notificaciones';

    if (!isSupported) {
        statusText = 'No compatible o en Incógnito';
        statusColor = '#f59e0b';
        opacity = '0.5';
        cursor = 'not-allowed';
        title = 'Actualiza tu navegador, quita el modo incógnito, o instala la PWA para usar notificaciones.';
    } else if (isOn) {
        statusText = 'Activado';
        statusColor = '#22c55e';
    } else if (permStatus === 'denied') {
        statusText = 'Bloqueado en navegador';
        statusColor = '#ef4444';
        opacity = '0.5';
        cursor = 'not-allowed';
        title = 'Ve a la configuración del navegador para habilitarlas.';
    }

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
                    title="${title}"
                    style="width:40px; height:22px; border:none; cursor:${cursor}; border-radius:9999px; background:${trackColor}; position:relative; flex-shrink:0; padding:0; opacity:${opacity}; overflow:hidden;">
                <span id="push-toggle-thumb" style="position:absolute; top:2px; left:0; width:18px; height:18px; background:white; border-radius:9999px; box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:transform 0.2s ease; transform:${thumbPos};"></span>
            </button>
        </div>
    `;
}

function bindPushToggle(isCurrentlyOn, permStatus, isSupported = true) {
    let toggleState = isCurrentlyOn && isSupported;
    setTimeout(() => {
        const btn = document.getElementById('push-toggle-btn');
        if (!btn) return;
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            let savedStr = localStorage.getItem('pnlPushLogs') || '[]';
            let logs = [];
            try { logs = JSON.parse(savedStr); } catch (e) { }

            const log = (msg) => {
                console.log(msg);
                logs.push(new Date().toLocaleTimeString() + " - " + msg);
                // Guardar inmediatamente en localStorage por si la app crashea
                localStorage.setItem('pnlPushLogs', JSON.stringify(logs.slice(-30))); // Mantener últimos 30
            };
            window.pnlLog = log;

            window.showPWALogs = () => {
                let currentLogs = [];
                try { currentLogs = JSON.parse(localStorage.getItem('pnlPushLogs') || '[]'); } catch (e) { }
                const logsHTML = '<div class="text-left text-[10px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-lg max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words border border-slate-700">' + (currentLogs.length ? currentLogs.join('<br>') : 'No hay logs aún.') + '</div>';

                const existingModal = document.getElementById('pwa-debug-modal');
                if (existingModal) existingModal.remove();

                const modal = document.createElement('div');
                modal.id = 'pwa-debug-modal';
                // Estructura exacta del overlay de abogados
                modal.className = "fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300";

                modal.innerHTML = `
                    <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg md:max-w-2xl overflow-hidden transform transition-all duration-300 border border-slate-100/50">
                        <div class="relative bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                            <h3 class="text-sm font-black uppercase tracking-widest text-[#fba931] flex items-center gap-2">
                                <span class="material-symbols-outlined text-lg">bug_report</span> 
                                PWA Console
                            </h3>
                            <button id="pwa-debug-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                                <span class="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <div class="p-5 md:p-8 bg-slate-50">
                            ${logsHTML}
                            <div class="mt-4 flex flex-col gap-2">
                                <button id="pwa-debug-copy" class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-base">content_copy</span> Copiar todo el texto
                                </button>
                                <button id="pwa-debug-clear" class="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-base">delete</span> Limpiar Logs
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
                document.getElementById('pwa-debug-close').addEventListener('click', () => modal.remove());

                document.getElementById('pwa-debug-copy').addEventListener('click', async () => {
                    try {
                        let textLogs = currentLogs.join('\\n');
                        if (!textLogs) textLogs = "No hay logs aún.";
                        await navigator.clipboard.writeText(textLogs);
                        const btn = document.getElementById('pwa-debug-copy');
                        btn.innerHTML = '<span class="material-symbols-outlined text-base">check</span> ¡Copiado!';
                        btn.classList.replace('bg-blue-500', 'bg-emerald-500');
                        btn.classList.replace('hover:bg-blue-600', 'hover:bg-emerald-600');
                        setTimeout(() => {
                            btn.innerHTML = '<span class="material-symbols-outlined text-base">content_copy</span> Copiar todo el texto';
                            btn.classList.replace('bg-emerald-500', 'bg-blue-500');
                            btn.classList.replace('hover:bg-emerald-600', 'hover:bg-blue-600');
                        }, 2000);
                    } catch (err) {
                        alert('Error al copiar: ' + err);
                    }
                });

                document.getElementById('pwa-debug-clear').addEventListener('click', () => {
                    localStorage.removeItem('pnlPushLogs');
                    logs = [];
                    modal.remove();
                    window.showPWALogs();
                });
            };

            log('PNL Push: [PWA DEBUG] Toggle presionado.');
            log(`PNL Push: Estado: toggleState=${toggleState} | permStatus=${permStatus} | isSupported=${isSupported}`);

            if (!isSupported) {
                log('PNL Push: ALERTA - pushManager.checkSupport() retornó FALSE.');
                log('PNL Push: El API no está soportado en este navegador o contexto (HTTP inseguro, modo incógnito, in-app).');
                // Eliminadas llamadas a showLogs() para que el usuario las consulte manualmente con el botón
                return;
            }

            if (permStatus === 'denied') {
                log('PNL Push: Permiso está denegado a nivel navegador.');
                const st = document.getElementById('push-toggle-status');
                if (st) { st.textContent = 'Ve a Configuración del navegador'; st.style.color = '#f59e0b'; }
                // Eliminadas llamadas a showLogs() para que el usuario las consulte manualmente con el botón
                return;
            }

            const track = document.getElementById('push-toggle-btn');
            const thumb = document.getElementById('push-toggle-thumb');
            const statusEl = document.getElementById('push-toggle-status');

            if (track) track.style.opacity = '0.5';

            try {
                if (toggleState) {
                    log('PNL Push: Intentando desuscribir...');
                    await window.pushManager.unsubscribe();
                    log('PNL Push: Desuscripción completada.');

                    if (thumb) thumb.style.transform = 'translateX(2px)';
                    if (track) { track.style.background = '#e2e8f0'; track.style.opacity = '1'; }
                    if (statusEl) { statusEl.textContent = 'Inactivo'; statusEl.style.color = '#94a3b8'; }
                    toggleState = false;
                    // Eliminadas llamadas a showLogs() para que el usuario las consulte manualmente con el botón
                } else {
                    log('PNL Push: Intentando solicitar permiso con requestPermission()...');
                    const granted = await window.pushManager.requestPermission();
                    log('PNL Push: Resultado devuelto por requestPermission(): ' + granted);

                    if (granted) {
                        log('PNL Push: Permiso concedido por el usuario, suscribiendo...');
                        const subResult = await window.pushManager.subscribe();
                        log('PNL Push: Resultado final de la suscripción (token sw): ' + (subResult ? 'Éxito' : 'Fallo o Null'));

                        if (subResult) {
                            if (thumb) thumb.style.transform = 'translateX(19px)';
                            if (track) { track.style.background = '#22c55e'; track.style.opacity = '1'; }
                            if (statusEl) { statusEl.textContent = 'Activado'; statusEl.style.color = '#22c55e'; }
                            toggleState = true;
                        } else {
                            log('PNL Push: ERROR - Falló la suscripción silente (posible problema de VAPID o Endpoint bloqueado).');
                            if (track) track.style.opacity = '1';
                        }
                        // Eliminadas llamadas a showLogs() para que el usuario las consulte manualmente con el botón
                    } else {
                        log('PNL Push: El usuario denegó o cerró el prompt nativo.');
                        if (track) track.style.opacity = '1';
                        if (statusEl) { statusEl.textContent = 'Permiso denegado o omitido'; statusEl.style.color = '#ef4444'; }
                        // Eliminadas llamadas a showLogs() para que el usuario las consulte manualmente con el botón
                    }
                }
            } catch (error) {
                log('PNL Push: EXCEPCIÓN FATAL. Error: ' + error.message);
                if (track) track.style.opacity = '1';
                // Eliminadas llamadas a showLogs() para que el usuario las consulte manualmente con el botón
            }
        });
    }, 0);
}

window.showNotificationHistory = async () => {
    // 1. Quitar modal si ya existe
    const existingModal = document.getElementById('notif-history-modal');
    if (existingModal) existingModal.remove();

    // 2. Crear overlay del modal
    const modal = document.createElement('div');
    modal.id = 'notif-history-modal';
    modal.className = "fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300";

    modal.innerHTML = `
        <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg md:max-w-xl overflow-hidden transform transition-all duration-300 border border-slate-100/50 flex flex-col max-h-[85vh]">
            <div class="relative bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                <h3 class="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">history</span> 
                    Bandeja de Entrada
                </h3>
                <button id="notif-history-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                    <span class="material-symbols-outlined text-xl">close</span>
                </button>
            </div>
            
            <div id="notif-history-content" class="p-0 bg-slate-50 flex-1 overflow-y-auto relative">
                <!-- Loader -->
                <div class="p-8 flex flex-col items-center justify-center text-slate-400">
                    <span class="material-symbols-outlined text-4xl animate-spin mb-3">progress_activity</span>
                    <p class="text-xs font-bold uppercase tracking-widest">Cargando Mensajes...</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('notif-history-close').addEventListener('click', () => {
        modal.remove();
    });

    const contentContainer = document.getElementById('notif-history-content');

    try {
        if (!window.supabaseClient) throw new Error("Supabase no inicializado.");

        // Obtener perfil actual para filtrar
        const { data: profileData } = await window.supabaseClient.from('profiles').select('id').eq('auth_id', (await window.supabaseClient.auth.getUser()).data.user.id).single();
        if (!profileData) throw new Error("Perfil no encontrado.");
        const profileId = profileData.id;

        // Obtener IDs de leídos desde la DB
        const { data: readData } = await window.supabaseClient
            .from('notification_reads')
            .select('notification_id')
            .eq('profile_id', profileId);
        
        const readIds = (readData || []).map(r => r.notification_id);

        // Obtener historial desde RPC seguro
        const { data, error } = await window.supabaseClient.rpc('get_my_push_history', { max_records: 50 });

        if (error) throw error;

        if (!data || data.length === 0) {
            contentContainer.innerHTML = `
                <div class="p-10 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <span class="material-symbols-outlined text-3xl">inbox</span>
                    </div>
                    <h4 class="text-slate-800 font-black text-sm mb-1">Bandeja Vacía</h4>
                    <p class="text-slate-500 text-xs">Aún no hay mensajes o anuncios enviados.</p>
                </div>
            `;
            return;
        }

        let htmlList = '<div class="divide-y divide-slate-100">';

        data.forEach(notif => {
            const isRead = readIds.includes(notif.id);
            const dateStr = new Date(notif.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

            const titleColor = isRead ? 'text-slate-600' : 'text-slate-900';
            const bgColor = isRead ? 'bg-white' : 'bg-blue-50/30';
            const badgeHTML = isRead
                ? ''
                : '<span class="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm shadow-blue-500/30">Nueva</span>';

            htmlList += `
                <div class="notif-history-item p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer ${bgColor} group" 
                     data-id="${notif.id}" data-url="${notif.url || ''}">
                     
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <h4 class="text-sm font-bold leading-tight ${titleColor} transition-colors group-hover:text-blue-600 flex-1">${notif.title}</h4>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                            ${badgeHTML}
                            <span class="text-[10px] font-medium text-slate-400 whitespace-nowrap">${dateStr}</span>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">${notif.body}</p>
                </div>
            `;
        });

        htmlList += '</div>';
        contentContainer.innerHTML = htmlList;

        // Agregar eventos de click a cada item
        const items = contentContainer.querySelectorAll('.notif-history-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                const id = item.getAttribute('data-id');
                const url = item.getAttribute('data-url');
                const notif = data.find(n => n.id === id);
                if (!notif) return;

                // Marcar como leído en la DB
                if (!readIds.includes(id)) {
                    // Optimistic update visual
                    readIds.push(id);
                    // Persistir en Supabase
                    window.supabaseClient.from('notification_reads').insert({
                        profile_id: profileId,
                        notification_id: id
                    }).then(({ error }) => {
                        if (error) console.error("Error persistiendo lectura:", error);
                    });

                    // Apagar visualmente el badge "Nueva" de inmediato
                    const badge = item.querySelector('.bg-blue-500');
                    if (badge) badge.remove();
                    item.classList.remove('bg-blue-50/30');
                    item.classList.add('bg-white');
                    const titleEl = item.querySelector('h4');
                    if (titleEl) {
                        titleEl.classList.remove('text-slate-900');
                        titleEl.classList.add('text-slate-600');
                    }
                }

                // Mostrar Modal de Lectura en lugar de redirigir de golpe
                const existingReadModal = document.getElementById('notif-read-modal');
                if (existingReadModal) existingReadModal.remove();

                const readModal = document.createElement('div');
                readModal.id = 'notif-read-modal';
                readModal.className = "fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300";

                const hasUrl = (url && url !== 'undefined' && url !== 'null' && url !== '');
                const urlBtnHTML = hasUrl
                    ? `<a href="${url}" class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-blue-500/30"><span class="material-symbols-outlined text-base">link</span> Ir al Enlace Adjunto</a>`
                    : '';

                const dateStr = new Date(notif.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

                readModal.innerHTML = `
                    <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden transform transition-all duration-300 border border-slate-100/50 flex flex-col animation-scale-up">
                        <div class="relative bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
                            <h3 class="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                                <span class="material-symbols-outlined text-lg">mail</span> 
                                Mensaje
                            </h3>
                            <button id="notif-read-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
                                <span class="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        
                        <div class="p-6 md:p-8 bg-white flex-1 overflow-y-auto">
                            <p class="text-[10px] font-medium text-slate-400 mb-2 uppercase tracking-wide">${dateStr}</p>
                            <h2 class="text-xl font-black text-slate-900 leading-tight mb-4">${notif.title}</h2>
                            <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">${notif.body}</p>
                            ${urlBtnHTML}
                        </div>
                    </div>
                `;

                document.body.appendChild(readModal);

                document.getElementById('notif-read-close').addEventListener('click', () => {
                    readModal.remove();
                    // Actualizar el contador global al cerrar el detalle de lectura
                    if (window.updateUnreadCount) window.updateUnreadCount();
                });
            });
        });

    } catch (err) {
        console.error("Error cargando historial de notificaciones:", err);
        contentContainer.innerHTML = `
                        < div class="p-8 text-center text-red-500 flex flex-col items-center" >
                <span class="material-symbols-outlined text-4xl mb-2 text-red-300">error</span>
                <p class="text-xs font-bold uppercase">Error cargando el historial.</p>
                <p class="text-[10px] text-red-400 mt-1">${err.message || 'Intente nuevamente más tarde.'}</p>
            </div >
                    `;
    }
};

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

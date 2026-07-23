import { showToast, toggleUserMenu, setButtonLoading } from '/public/assets/js/modules/ui.js';
import { logout, initNavbar } from '/public/assets/js/modules/auth.js';
import { validateRUT } from '/public/assets/js/modules/validation.js';
import { showImpactModal, handleModalImageError, closeImpactModal, checkAndShowAnnouncements, openImageZoom, copyToClipboard } from '/public/assets/js/modules/announcements.js';
import { logSystemEvent, logError } from '/public/assets/js/modules/logger.js';
import { PushNotificationManager } from '/public/assets/js/modules/push-manager.js';
import { showIOSInstallPrompt } from '/public/assets/js/modules/ios-prompt.js';
import { PNLWizard } from '/public/assets/js/modules/wizard.js';
import DOMPurify from 'dompurify';

// --- EXPOSICIÓN GLOBAL AL OBJETO WINDOW ---
window.showToast = showToast;
window.toggleUserMenu = toggleUserMenu;
window.setButtonLoading = setButtonLoading;
window.logout = logout;
window.initNavbar = initNavbar;
window.validateRUT = validateRUT;
window.showImpactModal = showImpactModal;
window.handleModalImageError = handleModalImageError;
window.closeImpactModal = closeImpactModal;
window.checkAndShowAnnouncements = checkAndShowAnnouncements;
window.openImageZoom = openImageZoom;
window.copyToClipboard = copyToClipboard;
window.logSystemEvent = logSystemEvent;
window.logError = logError;

/**
 * 🛡️ Sanitiza HTML para prevenir XSS manteniendo estilos de Tailwind.
 */
export function sanitizeHTML(dirty) {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'p', 'span', 'img', 'div', 'button', 'select', 'option', 'input', 'label', 'svg', 'line', 'polyline', 'path', 'rect', 'g', 'circle'],
        ALLOWED_ATTR: ['class', 'id', 'href', 'target', 'rel', 'src', 'alt', 'style', 'title', 'data-*', 'required', 'placeholder', 'rows', 'type', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'points', 'x', 'y', 'width', 'height', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2'],
        KEEP_CONTENT: true
    });
}
window.sanitizeHTML = sanitizeHTML;

/**
 * 📧 Sanitiza HTML de correos (S-06) antes de enviarlo.
 * Allowlist amplia (tablas, estilos inline, imágenes) apta para plantillas de
 * email, pero DOMPurify elimina <script>, manejadores on*, y URLs javascript:.
 * Defensa en profundidad: aunque los clientes de correo ya no ejecutan JS,
 * evita inyecciones y HTML peligroso en el contenido enviado/almacenado.
 */
export function sanitizeEmailHTML(dirty) {
    if (!dirty || typeof dirty !== 'string') return '';
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'u', 's', 'p', 'div', 'span', 'br', 'hr',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'img', 'table', 'thead',
            'tbody', 'tfoot', 'tr', 'td', 'th', 'style', 'center', 'font', 'blockquote'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'style', 'align',
            'valign', 'bgcolor', 'background', 'border', 'cellpadding', 'cellspacing',
            'colspan', 'rowspan', 'target', 'rel', 'class', 'dir', 'color', 'face', 'size'],
        ALLOW_DATA_ATTR: false
    });
}
window.sanitizeEmailHTML = sanitizeEmailHTML;

/**
 * 🔐 Verifica el rol del usuario contra la BASE DE DATOS (no localStorage).
 *
 * SEGURIDAD (S-01): `localStorage.pnl_user_role` es manipulable por el cliente
 * (cualquiera puede hacer `localStorage.setItem('pnl_user_role','super_admin')`
 * en la consola). Por eso NUNCA debe usarse para autorizar el acceso a paneles
 * de administración. Esta función:
 *   1. Valida el token de sesión con getUser() (verifica firma contra el servidor).
 *   2. Consulta el rol real en la tabla `profiles`.
 *   3. Devuelve { ok, role, user } y sincroniza el caché local solo como
 *      conveniencia de UI (nunca como autoridad).
 *
 * La barrera FINAL sigue siendo el RLS de la base de datos; esto es defensa
 * en profundidad del lado del cliente para no mostrar paneles a quien no debe.
 *
 * @param {string[]} allowedRoles Roles autorizados (vacío = cualquier rol válido).
 * @returns {Promise<{ok: boolean, role: string|null, user: object|null}>}
 */
export async function verifyAdminAccess(allowedRoles = []) {
    // Esperar a que Supabase se inicialice (máx. ~5s)
    let attempts = 0;
    while (!window.isSupabaseInit && attempts < 20) {
        await new Promise(r => setTimeout(r, 250));
        attempts++;
    }

    if (!window.supabaseClient || !window.supabaseClient.auth) {
        return { ok: false, role: null, user: null };
    }

    try {
        const { data: { user }, error: userErr } = await window.supabaseClient.auth.getUser();
        if (userErr || !user) return { ok: false, role: null, user: null };

        const { data: profile, error: profErr } = await window.supabaseClient
            .from('profiles')
            .select('role')
            .eq('auth_id', user.id)
            .maybeSingle();

        if (profErr) {
            console.error('[verifyAdminAccess] Error consultando rol:', profErr.message);
            return { ok: false, role: null, user };
        }

        const role = profile?.role || null;

        // Sincronizar caché local (solo conveniencia de UI, NUNCA autoridad)
        if (role) localStorage.setItem('pnl_user_role', role);

        const ok = !!role && (allowedRoles.length === 0 || allowedRoles.includes(role));
        return { ok, role, user };
    } catch (err) {
        console.error('[verifyAdminAccess] Excepción:', err);
        return { ok: false, role: null, user: null };
    }
}
window.verifyAdminAccess = verifyAdminAccess;

// Función para reiniciar el Wizard voluntariamente
window.restartWizard = () => {
    localStorage.removeItem('pnl_wizard_done');
    const wizard = new PNLWizard();
    wizard.start();
};

// Instanciar Push Manager (disponible globalmente para auth.js y el toggle)
const pushManager = new PushNotificationManager();
window.pushManager = pushManager;

// --- GESTIÓN DE MODAL DE VIDEO YOUTUBE ---
window.openVideoModal = function (url) {
    if (!url) return;

    function getYoutubeID(u) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = u.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const ytId = getYoutubeID(url);

    // Si no es un enlace de YouTube válido, usar fallback estándar (nueva pestaña)
    if (!ytId) {
        window.open(url, '_blank');
        return;
    }

    // Es un video de YouTube, inyectar el Modal
    const modalId = 'global-yt-modal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[200000] flex items-center justify-center p-4 sm:p-10 bg-slate-900/95 backdrop-blur-md opacity-0 transition-opacity duration-300';

    modal.innerHTML = `
        <div class="relative w-full max-w-5xl bg-black rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden transform scale-95 transition-transform duration-300 flex flex-col" style="aspect-ratio: 16/9; max-height: 90vh;">
            <button id="close-yt-modal" class="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all focus:outline-none" title="Cerrar Video">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
            <iframe class="w-full h-full border-0" 
                src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&playsinline=1" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen>
            </iframe>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Animación de entrada
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.firstElementChild.classList.remove('scale-95');
        modal.firstElementChild.classList.add('scale-100');
    });

    const closeModal = () => {
        modal.classList.add('opacity-0');
        modal.firstElementChild.classList.remove('scale-100');
        modal.firstElementChild.classList.add('scale-95');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    };

    document.getElementById('close-yt-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(); // Cerrar al tocar el fondo oscuro
    });
};

// --- GESTIÓN DE NOTIFICACIONES PUSH (solo iOS con suscripción silenciosa) ---
// La suscripción voluntaria ahora se gestiona desde el toggle en el menú del usuario (auth.js)
async function setupPushNotifications() {
    if (!pushManager.checkSupport()) return;

    // Esperar a que Supabase esté listo
    let attempts = 0;
    while (!window.isSupabaseInit && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }

    if (!window.supabaseClient || !window.supabaseClient.auth) {
        console.warn("[Push] Supabase no disponible para suscripción.");
        return;
    }

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    // Solo en iOS standalone: intentar suscribir silenciosamente si ya tiene permiso
    if (pushManager.isIOS()) {
        if (!pushManager.isStandalone()) {
            showIOSInstallPrompt(); // Guía de instalación en iOS Safari
        } else {
            // Ya instalada en iOS: suscribir si tiene permiso concedido
            const isSubscribed = await pushManager.isSubscribed();
            if (!isSubscribed && pushManager.getPermissionStatus() === 'granted') {
                await pushManager.subscribe();
            }
        }
    }
    // En Android/Chrome: si ya tiene permiso granted (de antes) pero no está suscrito, suscribir silenciosamente
    else if (pushManager.getPermissionStatus() === 'granted') {
        const isSubscribed = await pushManager.isSubscribed();
        if (!isSubscribed) await pushManager.subscribe();
    }
    // Para el estado 'default' el usuario usa el toggle del menú
}

// --- INICIALIZACIÓN AUTOMÁTICA ---
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        initNavbar();
        checkAndShowAnnouncements();
        setupPushNotifications();

        // Wizard: botón de ayuda flotante + guía opcional (reactivado).
        // Para desactivarlo, comenta estas dos líneas en AMBOS bloques.
        const wizard = new PNLWizard();
        wizard.start();
    });
} else {
    initNavbar();
    checkAndShowAnnouncements();
    setupPushNotifications();

    // Wizard: botón de ayuda flotante + guía opcional (reactivado).
    const wizard = new PNLWizard();
    wizard.start();
}

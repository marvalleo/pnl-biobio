import { showToast, toggleUserMenu, setButtonLoading } from '/public/assets/js/modules/ui.js';
import { logout, initNavbar } from '/public/assets/js/modules/auth.js';
import { validateRUT } from '/public/assets/js/modules/validation.js';
import { showImpactModal, handleModalImageError, closeImpactModal, checkAndShowAnnouncements } from '/public/assets/js/modules/announcements.js';
import { PushNotificationManager } from '/public/assets/js/modules/push-manager.js';
import { showIOSInstallPrompt } from '/public/assets/js/modules/ios-prompt.js';

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
    });
} else {
    initNavbar();
    checkAndShowAnnouncements();
    setupPushNotifications();
}

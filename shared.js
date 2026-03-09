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

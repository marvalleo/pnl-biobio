import { showToast, toggleUserMenu, setButtonLoading } from '/public/assets/js/modules/ui.js';
import { logout, initNavbar } from '/public/assets/js/modules/auth.js';
import { validateRUT } from '/public/assets/js/modules/validation.js';
import { showImpactModal, handleModalImageError, closeImpactModal, checkAndShowAnnouncements } from '/public/assets/js/modules/announcements.js';
import { PushNotificationManager } from '/public/assets/js/modules/push-manager.js';
import { showIOSInstallPrompt } from '/public/assets/js/modules/ios-prompt.js';
import { showPushPermissionBanner } from '/public/assets/js/modules/push-banner.js';

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

// Instanciar Push Manager
const pushManager = new PushNotificationManager();
window.pushManager = pushManager;

// --- GESTIÓN DE NOTIFICACIONES PUSH ---
async function setupPushNotifications() {
    if (!pushManager.checkSupport()) return;

    // 1. Esperar a que Supabase esté listo (ya que necesitamos el usuario)
    let attempts = 0;
    while (!window.isSupabaseInit && attempts < 10) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
    }

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return; // Solo pedimos push a usuarios logueados

    // 2. Lógica por plataforma
    if (pushManager.isIOS()) {
        if (!pushManager.isStandalone()) {
            // Si está en Safari iOS pero no instalada, mostrar guía
            showIOSInstallPrompt();
        } else {
            // Si está instalada en iOS, intentar suscribir (Safari 16.4+)
            await trySubscribe();
        }
    } else {
        // En otros navegadores (Chrome/Android/Firefox)
        const isSubscribed = await pushManager.isSubscribed();
        if (!isSubscribed) {
            if (pushManager.getPermissionStatus() === 'default') {
                // Si no ha decidido, mostrar nuestro banner
                showPushPermissionBanner(async () => {
                    const granted = await pushManager.requestPermission();
                    if (granted) await pushManager.subscribe();
                });
            }
        }
    }
}

async function trySubscribe() {
    const isSubscribed = await pushManager.isSubscribed();
    if (!isSubscribed && pushManager.getPermissionStatus() === 'granted') {
        // Si tiene permiso pero no está en la DB, suscribir silenciosamente
        await pushManager.subscribe();
    }
}

// --- INICIALIZACIÓN AUTOMÁTICA DEL SISTEMA BASE ---
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

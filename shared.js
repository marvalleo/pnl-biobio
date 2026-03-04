/**
 * shared.js - Lógica común para la plataforma Forja Biobío
 * Actúa como punto de entrada (Entry Point) agrupando módulos ES6.
 */

import { showToast, toggleUserMenu, setButtonLoading } from '/public/assets/js/modules/ui.js';
import { logout, initNavbar } from '/public/assets/js/modules/auth.js';
import { validateRUT } from '/public/assets/js/modules/validation.js';
import { showImpactModal, handleModalImageError, closeImpactModal, checkAndShowAnnouncements } from '/public/assets/js/modules/announcements.js';

// --- EXPOSICIÓN GLOBAL AL OBJETO WINDOW ---
// Esto permite que el código inline en varios archivos HTML 
// (e.g. onclick="logout()") siga funcionando sin modificar todo el proyecto.
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

// --- INICIALIZACIÓN AUTOMÁTICA DEL SISTEMA BASE ---
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        initNavbar();
        checkAndShowAnnouncements();
    });
} else {
    // Si ya cargó el DOM, ejecutar de inmediato
    initNavbar();
    checkAndShowAnnouncements();
}

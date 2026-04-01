export function showToast(message, type = 'info') {
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
    const sanitize = (html) => (window.sanitizeHTML ? window.sanitizeHTML(html) : html);
    toast.innerHTML = sanitize(`
        <span class="material-symbols-outlined text-lg">${icons[type] || 'info'}</span>
        ${message}
    `);

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

export function toggleUserMenu() {
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

export function setButtonLoading(button, isLoading, loadingText = 'Procesando') {
    if (!button) return;

    if (!button.dataset.originalHtml) {
        button.dataset.originalHtml = button.innerHTML;
    }

    if (isLoading) {
        button.disabled = true;
        button.classList.add('opacity-70', 'cursor-wait');
        const sanitize = (html) => (window.sanitizeHTML ? window.sanitizeHTML(html) : html);
        button.innerHTML = sanitize(`
            <span class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full shrink-0"></span>
            <span>${loadingText}</span>
        `);
    } else {
        button.disabled = false;
        button.classList.remove('opacity-70', 'cursor-wait');
        const sanitize = (html) => (window.sanitizeHTML ? window.sanitizeHTML(html) : html);
        button.innerHTML = sanitize(button.dataset.originalHtml);
    }
}

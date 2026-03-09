class PnlNavbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const type = this.getAttribute('type') || 'public'; // 'public', 'forja', 'forja-post', 'admin'
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        if (type === 'public') {
            this.renderPublicNav(currentPath);
        } else if (type === 'forja') {
            this.renderForjaNav(currentPath);
        } else if (type === 'forja-post') {
            this.renderForjaPostNav(currentPath);
        } else if (type === 'forja-dashboard') {
            this.renderForjaDashboardNav(currentPath);
        }
    }

    renderPublicNav(currentPath) {
        const links = [
            { id: 'inicio', path: 'index.html', label: 'Inicio', isExternal: false },
            { id: 'nosotros', path: 'nosotros.html', label: 'Nosotros', isExternal: false },
            { id: 'publicaciones', path: 'publicaciones-oficiales.html', label: 'Publicaciones', isExternal: false },
            { id: 'contacto', path: 'contacto.html', label: 'Contacto', isExternal: false }
        ];

        let navLinksHTML = '';
        links.forEach(link => {
            const isActive = currentPath === link.path
                ? 'text-[#0f172a] border-b-[3px] border-[#fba931] pb-1'
                : 'text-gray-400 border-b-[3px] border-transparent pb-1 hover:text-[#0f172a] hover:border-[#fba931]/40';
            navLinksHTML += `<a href="${link.path}" class="cursor-pointer font-extrabold uppercase text-sm tracking-[0.1em] transition-all duration-300 ${isActive} whitespace-nowrap">${link.label}</a>`;
        });

        let mobileLinksHTML = '';
        links.forEach(link => {
            const isActive = currentPath === link.path
                ? 'text-[#0f172a] bg-[#fba931]/10 border-l-4 border-[#fba931]'
                : 'text-gray-500 border-l-4 border-transparent hover:text-[#0f172a] hover:bg-gray-50';
            mobileLinksHTML += `<a href="${link.path}" class="block font-extrabold uppercase text-xs tracking-[0.1em] px-4 py-3 transition-all duration-200 ${isActive}">${link.label}</a>`;
        });

        // The 'Acceso Forja' button shouldn't appear directly on the desktop navbar for the homepage (index.html).
        let extraButton = '';
        let extraButtonMobile = '';
        if (currentPath !== 'index.html' && currentPath !== '') {
            extraButton = `<a href="forja-login.html" class="bg-[#0f172a] text-white px-6 py-2.5 rounded-lg text-[10px] font-black uppercase hover:bg-[#1e293b] hover:shadow-lg transition-all duration-300 shadow-md">Acceso Forja</a>`;
            extraButtonMobile = `<a href="forja-login.html" class="block text-center bg-[#0f172a] text-white px-4 py-3 rounded-lg text-xs font-black uppercase mt-2">Acceso Forja</a>`;
        }

        this.innerHTML = `
            <nav class="bg-white sticky top-0 z-50" style="box-shadow: 0 2px 16px rgba(15,23,42,0.08), 0 1px 3px rgba(251,169,49,0.1);">
                <div class="max-w-[1360px] mx-auto px-10 h-[84px] flex justify-between items-center">
                    <div class="flex items-center gap-5">
                        <a href="index.html" class="flex items-center">
                            <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL Biobío" class="h-[72px] py-1 transition-transform duration-300 hover:scale-[1.03]">
                        </a>
                        <div class="hidden lg:block w-px h-10 bg-gray-200"></div>
                    </div>
                    <!-- Menu PC -->
                    <div class="hidden lg:flex items-center gap-7 xl:gap-9">
                        ${navLinksHTML}
                        ${extraButton}
                    </div>
                    <!-- Menu Mobile Button -->
                    <div class="lg:hidden flex items-center">
                        <button id="mobile-menu-btn" class="text-[#0f172a] p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <span class="material-symbols-outlined text-3xl">menu</span>
                        </button>
                    </div>
                </div>
                <!-- Gold accent bar -->
                <div class="h-[3px] bg-gradient-to-r from-[#fba931] via-[#f59e0b] to-[#fba931]"></div>
                <!-- Mobile Dropdown -->
                <div id="mobile-menu" class="hidden lg:hidden bg-white absolute w-full left-0 top-[87px] shadow-xl border-t border-gray-100">
                    <div class="flex flex-col px-4 py-3 space-y-1">
                        ${mobileLinksHTML}
                        ${extraButtonMobile}
                    </div>
                </div>
            </nav>
        `;

        // Mobile menu toggle logic
        const btn = this.querySelector('#mobile-menu-btn');
        const menu = this.querySelector('#mobile-menu');
        if (btn && menu) {
            btn.addEventListener('click', () => {
                menu.classList.toggle('hidden');
            });
        }
    }

    renderForjaNav(currentPath) {
        const links = [
            { id: 'academia', path: 'forja-academia.html', label: 'Academia' },
            { id: 'eventos', path: 'forja-eventos.html', label: 'Eventos' },
            { id: 'foros', path: 'forja-foros.html', label: 'Foros' },
            { id: 'votaciones', path: 'forja-votaciones.html', label: 'Votaciones' }
        ];

        // Links para desktop
        let desktopLinksHTML = '';
        links.forEach(link => {
            const isActive = currentPath === link.path
                ? 'text-[#0f172a] after:content-[\\'\\'] after:absolute after:w-full after:h-[3px] after:-bottom-[4px] after:left-0 after:bg-[#fba931]'
                : 'text-gray-400 hover:text-[#fba931]';
            desktopLinksHTML += `<a href="${link.path}" class="relative cursor-pointer font-bold uppercase text-[11px] tracking-[0.05em] transition-all duration-300 ${isActive} whitespace-nowrap">${link.label}</a>`;
        });

        // Links para el menú mobile desplegable
        let mobileLinksHTML = '';
        links.forEach(link => {
            const isActive = currentPath === link.path
                ? 'text-[#0f172a] bg-[#fba931]/10 border-l-4 border-[#fba931]'
                : 'text-gray-500 border-l-4 border-transparent hover:text-[#0f172a] hover:bg-gray-50';
            mobileLinksHTML += `<a href="${link.path}" class="block font-extrabold uppercase text-xs tracking-[0.1em] px-5 py-3 transition-all duration-200 ${isActive}">${link.label}</a>`;
        });

        this.innerHTML = `
             <nav class="bg-white shadow-sm sticky top-0 z-50 border-b-4 border-[#fba931]">
                <div class="max-w-[1360px] mx-auto px-3 md:px-10 h-16 md:h-20 flex justify-between items-center gap-3">
                    <!-- Logo -->
                    <div class="flex items-center gap-2 shrink-0">
                        <a href="forja-academia.html" class="flex items-center gap-2">
                            <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL Biobío" class="h-10 md:h-14">
                            <div class="hidden lg:flex items-center gap-1.5 ml-1">
                                <span class="font-black text-xl tracking-tighter uppercase leading-none text-[#0f172a]">FORJA</span>
                                <span class="text-[#fba931] text-xl font-black tracking-widest uppercase leading-none">Biobío</span>
                            </div>
                        </a>
                    </div>
                    
                    <!-- Links desktop (ocultos en mobile) -->
                    <div class="hidden md:flex flex-1 items-center justify-end gap-6 mx-8">
                        ${desktopLinksHTML}
                    </div>

                    <!-- Controles derechos: avatar + hamburguesa mobile -->
                    <div class="flex items-center gap-3 shrink-0">
                        <!-- Hamburguesa solo en mobile -->
                        <button id="forja-hamburger-btn" class="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <span class="material-symbols-outlined text-[#0f172a]" style="font-size:22px;">menu</span>
                        </button>

                        <!-- Avatar usuario -->
                        <div id="user-menu-container" class="flex items-center shrink-0">
                            <div class="w-9 h-9 rounded-full bg-gray-100 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                <!-- Menú mobile desplegable (oculto por defecto) -->
                <div id="forja-mobile-menu" class="hidden md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 z-40">
                    <div class="flex flex-col py-2">
                        ${mobileLinksHTML}
                    </div>
                </div>
            </nav>
        `;

        // Toggle menú hamburguesa
        const hamburgerBtn = this.querySelector('#forja-hamburger-btn');
        const mobileMenu = this.querySelector('#forja-mobile-menu');
        if (hamburgerBtn && mobileMenu) {
            hamburgerBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
                const icon = hamburgerBtn.querySelector('.material-symbols-outlined');
                if (icon) icon.textContent = mobileMenu.classList.contains('hidden') ? 'menu' : 'close';
            });
        }
    }

    renderForjaPostNav(currentPath) {
        this.innerHTML = `
            <nav class="bg-white shadow-sm border-b-4 border-[#fba931] shrink-0 sticky top-0 z-50">
                <div class="max-w-[1600px] mx-auto px-6 h-20 flex justify-between items-center">
                    <div class="flex items-center gap-6">
                        <a href="forja-foros.html" class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-3xl text-[#0f172a]">arrow_back</span>
                        </a>
                        <div class="h-8 w-[1px] bg-gray-100"></div>
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black uppercase text-[#fba931] mb-1 tracking-widest">Debate en Curso</span>
                            <span id="nav-topic-title" class="font-black text-lg uppercase leading-none truncate max-w-[200px] md:max-w-md">Cargando...</span>
                        </div>
                    </div>

                    <div id="user-menu-container" class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-gray-100 animate-pulse"></div>
                    </div>
                </div>
            </nav>
        `;
    }

    renderForjaDashboardNav(currentPath) {
        this.innerHTML = `
            <nav id="main-nav" class="bg-white shadow-md sticky top-0 z-50 border-b-4 border-pnl-gold hidden">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-24">
                        <div class="flex items-center gap-4 cursor-pointer" onclick="navigate('dashboard')">
                            <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL" class="h-12">
                            <div class="hidden sm:block">
                                <span class="font-black text-lg tracking-tighter uppercase leading-none block">FORJA</span>
                                <span class="text-[#fba931] text-xs font-bold tracking-widest uppercase">Biobío</span>
                            </div>
                        </div>

                        <div class="flex items-center space-x-4 md:space-x-8">
                            <span onclick="navigate('dashboard')" id="link-dashboard" class="nav-link text-[#0f172a] active">Academia</span>
                            <span onclick="navigate('eventos')" id="link-eventos" class="nav-link text-[#0f172a]">Eventos</span>
                            <button onclick="logout()" class="text-[9px] font-black uppercase bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">Salir</button>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }
}

customElements.define('pnl-navbar', PnlNavbar);

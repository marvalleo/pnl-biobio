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
                ? 'text-[#0f172a] after:content-[\'\'] after:absolute after:w-full after:h-[3px] after:-bottom-[4px] after:left-0 after:bg-[#fba931]'
                : 'text-gray-400 hover:text-[#fba931]';
            navLinksHTML += `<a href="${link.path}" class="relative cursor-pointer font-bold uppercase text-xs tracking-[0.05em] transition-all duration-300 ${isActive} whitespace-nowrap">${link.label}</a>`;
        });

        // The 'Acceso Forja' button shouldn't appear directly on the desktop navbar for the homepage (index.html).
        let extraButton = '';
        if (currentPath !== 'index.html' && currentPath !== '') {
            extraButton = `<a href="forja-login.html" class="bg-[#0f172a] text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all">Acceso Forja</a>`;
        }

        this.innerHTML = `
            <nav class="bg-white shadow-sm sticky top-0 z-50 border-b-4 border-[#fba931]">
                <div class="max-w-[1360px] mx-auto px-10 h-20 flex justify-between items-center">
                    <div class="flex items-center gap-4">
                        <a href="index.html">
                            <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL Biobío" class="h-14">
                        </a>
                    </div>
                    <!-- Menu PC -->
                    <div class="hidden lg:flex items-center gap-4 lg:gap-8">
                        ${navLinksHTML}
                        ${extraButton}
                    </div>
                    <!-- Menu Mobile Button -->
                    <div class="lg:hidden flex items-center pr-4">
                        <button id="mobile-menu-btn" class="text-[#0f172a]">
                            <span class="material-symbols-outlined text-3xl">menu</span>
                        </button>
                    </div>
                </div>
                <!-- Mobile Dropdown -->
                <div id="mobile-menu" class="hidden lg:hidden bg-white border-t border-gray-100 absolute w-full left-0 top-20 shadow-lg">
                    <div class="flex flex-col px-6 py-4 space-y-4">
                        ${navLinksHTML}
                        ${extraButton}
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

        let navLinksHTML = '';
        links.forEach(link => {
            const isActive = currentPath === link.path
                ? 'text-[#0f172a] after:content-[\'\'] after:absolute after:w-full after:h-[3px] after:-bottom-[4px] after:left-0 after:bg-[#fba931]'
                : 'text-gray-400 hover:text-[#fba931]';
            navLinksHTML += `<a href="${link.path}" class="relative cursor-pointer font-bold uppercase text-xs tracking-[0.05em] transition-all duration-300 ${isActive} whitespace-nowrap">${link.label}</a>`;
        });

        this.innerHTML = `
             <nav class="bg-white shadow-sm sticky top-0 z-50 border-b-4 border-[#fba931]">
                <div class="max-w-[1360px] mx-auto px-4 md:px-10 h-20 flex justify-between items-center">
                    <div class="flex items-center gap-2 md:gap-4 shrink-0">
                        <a href="forja-academia.html" class="flex items-center gap-2 md:gap-4">
                            <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL Biobío" class="h-10 md:h-14">
                            <div class="hidden sm:flex items-center gap-1.5 ml-1">
                                <span class="font-black text-lg lg:text-2xl tracking-tighter uppercase leading-none text-[#0f172a]">FORJA</span>
                                <span class="text-[#fba931] text-lg lg:text-2xl font-black tracking-widest uppercase leading-none">Biobío</span>
                            </div>
                        </a>
                    </div>
                    
                    <div class="flex flex-1 items-center justify-end gap-6 mx-4 md:mx-8">
                        ${navLinksHTML}
                    </div>

                    <div id="user-menu-container" class="flex items-center shrink-0 gap-4">
                        <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 animate-pulse"></div>
                    </div>
                </div>
            </nav>
        `;
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

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
            { id: 'recursos', path: 'recursos.html', label: 'Recursos', isExternal: false },
            { id: 'contacto', path: 'contacto.html', label: 'Contacto', isExternal: false }
        ];

        let navLinksHTML = '';
        links.forEach(link => {
            const isActive = currentPath === link.path;
            const linkStyle = isActive
                ? "color: #0f172a; border-bottom: 3px solid #fba931; padding-bottom: 6px; font-weight: 800;"
                : "color: #9ca3af; border-bottom: 3px solid transparent; padding-bottom: 6px; font-weight: 800;";

            navLinksHTML += `
                <a href="${link.path}" 
                   style="text-decoration: none; text-transform: uppercase; font-size: 14px; letter-spacing: 0.1em; font-family: 'Montserrat', sans-serif !important; transition: all 0.3s; ${linkStyle} display: inline-block;" 
                   class="cursor-pointer whitespace-nowrap">
                   ${link.label}
                </a>`;
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
        const isHomePage = currentPath === 'index.html' || currentPath === '';
        const buttonStyle = "background-color: #0f172a; color: white; padding: 10px 24px; border-radius: 8px; font-size: 11px; font-weight: 900; text-transform: uppercase; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; font-family: 'Montserrat', sans-serif;";

        if (!isHomePage) {
            const fixedButtonStyle = buttonStyle + " width: 160px; height: 42px; display: flex; align-items: center; justify-content: center; white-space: nowrap;";
            extraButton = `<a href="forja-login.html" style="${fixedButtonStyle}" onmouseover="this.style.backgroundColor='#1e293b'" onmouseout="this.style.backgroundColor='#0f172a'">Acceso Forja</a>`;
            extraButtonMobile = `<a href="forja-login.html" style="${buttonStyle} width: 100%; text-align: center; margin-top: 8px;">Acceso Forja</a>`;
        } else {
            const fixedButtonStyle = buttonStyle + " width: 160px; height: 42px; display: flex; align-items: center; justify-content: center; white-space: nowrap;";
            extraButton = `<a href="https://nacionallibertario.cl/" target="_blank" style="${fixedButtonStyle}" onmouseover="this.style.backgroundColor='#1e293b'" onmouseout="this.style.backgroundColor='#0f172a'">Sitio Nacional</a>`;
            extraButtonMobile = `<a href="https://nacionallibertario.cl/" target="_blank" style="${buttonStyle} width: 100%; text-align: center; margin-top: 8px;">PNL Nacional</a>`;
        }

        this.innerHTML = `
            <nav class="bg-white sticky top-0 z-50" style="box-shadow: 0 4px 12px rgba(15,23,42,0.05);">
                <div class="max-w-[1360px] mx-auto px-10 h-[120px] flex justify-between items-center">
                    <div class="flex items-center gap-5">
                        <a href="index.html" class="flex items-center">
                            <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL Biobío" style="height: 80px; padding: 5px 0;" class="transition-transform duration-300 hover:scale-[1.02]">
                        </a>
                        <div class="hidden lg:block w-px h-10 bg-gray-100"></div>
                    </div>
                    
                    <!-- Contenedor de links y botón (Se desplaza dinámicamente) -->
                    <div class="hidden lg:flex" style="align-items: center; gap: 40px;">
                        ${navLinksHTML}
                        ${extraButton}
                    </div>
                    <!-- Menu Mobile Button (Oculto en desktop) -->
                    <div class="lg:hidden flex items-center">
                        <button id="mobile-menu-btn" style="background: transparent; border: none; cursor: pointer; color: #0f172a; padding: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 32px;">menu</span>
                        </button>
                    </div>
                </div>
                <!-- Gold accent bar -->
                <div style="height: 3px; background-color: #fba931;"></div>
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
            const isActive = currentPath === link.path;
            const linkStyle = isActive
                ? "color: #0f172a; border-bottom: 3px solid #fba931; padding-bottom: 4px; font-weight: 800;"
                : "color: #9ca3af; border-bottom: 3px solid transparent; padding-bottom: 4px; font-weight: 800;";

            desktopLinksHTML += `
                <a href="${link.path}" 
                   style="text-decoration: none; text-transform: uppercase; font-size: 14px; letter-spacing: 0.1em; transition: all 0.3s; ${linkStyle}" 
                   class="cursor-pointer whitespace-nowrap">
                   ${link.label}
                </a>`;
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
            <style>
                #forja-desktop-links { display: none !important; }
                #forja-hamburger-btn { display: flex !important; }
                @media (min-width: 768px) {
                    #forja-desktop-links { display: flex !important; }
                    #forja-hamburger-btn { display: none !important; }
                    #forja-mobile-menu { display: none !important; }
                }
            </style>
             <nav class="bg-white sticky top-0 z-50" style="box-shadow: 0 4px 12px rgba(15,23,42,0.05);">
                <div class="max-w-[1360px] mx-auto px-10 h-[120px] flex justify-between items-center">
                    <!-- Logo -->
                    <div class="flex items-center gap-5">
                        <a href="forja-academia.html" class="flex items-center gap-2">
                            <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL Biobío" style="height: 80px; padding: 5px 0;">
                            <div class="hidden lg:flex items-center gap-1.5 ml-1">
                                <span class="font-black text-xl tracking-tighter uppercase leading-none text-[#0f172a]">FORJA</span>
                                <span class="text-[#fba931] text-xl font-black tracking-widest uppercase leading-none">Biobío</span>
                            </div>
                        </a>
                    </div>
                    
                    <!-- Links desktop (controlados por media query) -->
                    <div id="forja-desktop-links" style="display: flex; items-center: center !important; gap: 40px;" class="items-center justify-end">
                        ${desktopLinksHTML}
                    </div>

                    <!-- Controles derechos: avatar + hamburguesa mobile -->
                    <div class="flex items-center gap-3 shrink-0">
                        <!-- Hamburguesa (controlado por media query) -->
                        <button id="forja-hamburger-btn" class="items-center justify-center w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <span class="material-symbols-outlined text-[#0f172a]" style="font-size:22px;">menu</span>
                        </button>

                        <!-- Avatar usuario -->
                        <div id="user-menu-container" class="flex items-center shrink-0">
                            <div class="w-9 h-9 rounded-full bg-gray-100 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                <!-- Menú mobile desplegable (oculto por defecto) -->
                <div id="forja-mobile-menu" class="hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 z-40">
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
            <nav id="main-nav" class="bg-white sticky top-0 z-50 hidden" style="box-shadow: 0 4px 12px rgba(15,23,42,0.05);">
                <div class="max-w-[1360px] mx-auto px-10 h-[120px] flex justify-between items-center">
                    <div class="flex items-center gap-5 cursor-pointer" onclick="navigate('dashboard')">
                        <img src="/assets/images/logos/pnl-del-biobio01.png" alt="PNL" style="height: 80px; padding: 5px 0;">
                        <div class="hidden sm:block">
                            <span class="font-black text-lg tracking-tighter uppercase leading-none block">FORJA</span>
                            <span class="text-[#fba931] text-xs font-bold tracking-widest uppercase">Biobío</span>
                        </div>
                    </div>

                    <div style="display: flex; items-center: center !important; gap: 40px;">
                        <span onclick="navigate('dashboard')" id="link-dashboard" class="nav-link text-[#0f172a] active" style="font-weight: 800; text-transform: uppercase; font-size: 14px; cursor: pointer;">Academia</span>
                        <span onclick="navigate('eventos')" id="link-eventos" class="nav-link text-[#0f172a]" style="font-weight: 800; text-transform: uppercase; font-size: 14px; cursor: pointer;">Eventos</span>
                        <button onclick="logout()" style="font-weight: 800; text-transform: uppercase; font-size: 10px; background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px;">Salir</button>
                    </div>
                </div>
                <div style="height: 3px; background-color: #fba931;"></div>
            </nav>
        `;
    }
}

customElements.define('pnl-navbar', PnlNavbar);

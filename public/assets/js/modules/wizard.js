// 🧙‍♂️ Wizard.js - Guía del Afiliado PNL Biobío (LSC V2 - Spotlight Edition)
export class PNLWizard {
    constructor() {
        this.currentStep = 0;
        this.isDisabled = localStorage.getItem('pnl_wizard_disabled') === 'true';
        this.context = this.getContextData();
    }

    start() {
        this.initHelpCenter();
        if (this.isDisabled || localStorage.getItem('pnl_wizard_done')) return;
        setTimeout(() => this.showStep(), 1200);
    }

    getContextData() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path === '/') {
            return {
                title: 'Navegación del Portal',
                tips: [
                    'Revisa los comunicados arriba.',
                    'Tu centro de acción es la Forja.',
                    'Edúcate en la Academia PNL.'
                ],
                steps: [
                    { target: 'pnl-navbar img', title: 'Identidad Regional', text: 'Este es el sitio oficial para todos los simpatizantes del Biobío. Aquí centralizamos la acción.' },
                    { target: 'a[href="forja-login.html"]', title: 'Acceso a la Forja', text: 'Ingresa aquí para ver tu perfil, tus insignias y tu centro de votación soberana.' },
                    { target: '#academia', title: 'Academia Biobío', text: 'Nuestra trinchera de ideas. Inscríbete y edúcate antes de la próxima batalla.' },
                    { target: '#votaciones', title: 'Poder de Voto', text: 'Tu voz es la que manda. Aquí gestionamos las decisiones regionales del partido.' }
                ]
            };
        }
        return { 
            title: 'Asistente LSC', 
            tips: ['Explora el portal regional.', 'Mantén tu soberanía digital.'],
            steps: [] 
        };
    }

    initHelpCenter() {
        let fab = document.getElementById('pnl-help-fab');
        if (!fab) {
            fab = document.createElement('div');
            fab.id = 'pnl-help-fab';
            fab.className = 'fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[99999]';
            const sanitize = (html) => (window.sanitizeHTML ? window.sanitizeHTML(html) : html);
            fab.innerHTML = sanitize(`
                <div id="help-menu" class="hidden absolute bottom-20 right-0 md:bottom-24 w-[85vw] md:w-80 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.4)] border-4 border-[#fba931] p-6 md:p-8 pnl-wizard-animate overflow-hidden origin-bottom-right">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-10 h-10 md:w-12 md:h-12 bg-[#0f172a] rounded-full flex items-center justify-center border-2 border-[#fba931] flex-shrink-0">
                            <img src="/public/assets/images/logos/pwa-icon-70.png" class="w-6 h-6 md:w-8 md:h-8 object-contain">
                        </div>
                        <div>
                            <h4 class="text-xl md:text-2xl font-900 uppercase text-[#0f172a] tracking-tight leading-none">${this.context.title}</h4>
                            <p class="text-[9px] md:text-[10px] font-black text-[#fba931] uppercase mt-1 tracking-widest">Asistente Regional</p>
                        </div>
                    </div>
                    
                    <div class="mb-6 md:mb-8 space-y-4 text-left">
                        <div class="bg-slate-50 p-4 md:p-5 rounded-3xl">
                            <p class="text-[9px] md:text-[10px] font-900 text-slate-400 uppercase tracking-widest mb-3 text-center">Tips del Momento</p>
                            <ul class="space-y-3">
                                ${this.context.tips.map(tip => `
                                    <li class="flex gap-3 text-xs font-bold text-slate-600 leading-tight">
                                        <span class="text-[#fba931]">•</span> ${tip}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="window.location.href='/contacto.html'" class="bg-slate-100 hover:bg-[#fba931]/10 p-3 rounded-2xl flex flex-col items-center gap-1 transition-all">
                                <span class="material-symbols-outlined text-[#0f172a] text-xl">support_agent</span>
                                <span class="text-[9px] font-black uppercase">Soporte</span>
                            </button>
                            <button onclick="window.location.href='/forja-academia.html'" class="bg-slate-100 hover:bg-[#fba931]/10 p-3 rounded-2xl flex flex-col items-center gap-1 transition-all">
                                <span class="material-symbols-outlined text-[#0f172a] text-xl">school</span>
                                <span class="text-[9px] font-black uppercase">Academia</span>
                            </button>
                        </div>
                    </div>

                    <div class="pt-6 border-t-2 border-slate-100 flex items-center justify-between mb-6">
                        <span class="font-bold text-[10px] md:text-xs text-slate-500 uppercase tracking-wide">Guía Automática</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="wizard-toggle" class="sr-only peer" ${!this.isDisabled ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fba931]"></div>
                        </label>
                    </div>
                    <button id="restart-tour" class="w-full bg-[#fba931] text-[#0f172a] py-4 md:py-5 rounded-3xl font-900 uppercase text-[10px] md:text-xs tracking-widest shadow-[0_10px_20px_-10px_#fba931] hover:scale-[1.02] active:scale-95 transition-all">Iniciar Guía Paso a Paso</button>
                </div>
                <button id="pnl-fab-btn" class="w-16 h-16 md:w-20 md:h-20 bg-[#0f172a] text-[#fba931] rounded-full shadow-[0_15px_40px_rgba(15,23,42,0.4)] flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-[#fba931]">
                    <span class="material-symbols-outlined text-4xl md:text-5xl">psychology_alt</span>
                </button>
            `);
            document.body.appendChild(fab);

            const menu = fab.querySelector('#help-menu');
            const btn = fab.querySelector('#pnl-fab-btn');
            
            // Interaction: Toggle Menu
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
                console.log('Wizard Menu Toggled');
            });

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!fab.contains(e.target)) menu.classList.add('hidden');
            });

            fab.querySelector('#wizard-toggle').onchange = (e) => {
                this.isDisabled = !e.target.checked;
                localStorage.setItem('pnl_wizard_disabled', this.isDisabled);
            };

            fab.querySelector('#restart-tour').onclick = () => {
                menu.classList.add('hidden');
                localStorage.removeItem('pnl_wizard_done');
                this.currentStep = 0;
                this.showStep();
            };
        }
        this.initSpotlight();
    }

    initSpotlight() {
        if (!document.getElementById('pnl-spotlight')) {
            const overlay = document.createElement('div');
            overlay.id = 'pnl-spotlight';
            overlay.className = 'fixed inset-0 z-[100000] pointer-events-none opacity-0 transition-opacity duration-500';
            overlay.style.background = 'radial-gradient(circle, transparent 150px, rgba(15, 23, 42, 0.7) 150px)';
            document.body.appendChild(overlay);
        }
    }

    showStep() {
        const steps = this.context.steps;
        if (steps.length === 0 || this.currentStep >= steps.length) {
            this.finish();
            return;
        }

        const step = steps[this.currentStep];
        const targetEl = document.querySelector(step.target);
        if (!targetEl) {
            this.currentStep++;
            this.showStep();
            return;
        }

        this.updateSpotlight(targetEl);
        this.createGuideCard(step, targetEl);
    }

    updateSpotlight(el) {
        const spotlight = document.getElementById('pnl-spotlight');
        const rect = el.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        spotlight.style.opacity = '1';
        spotlight.style.background = `radial-gradient(circle 200px at ${x}px ${y}px, transparent 100%, rgba(15, 23, 42, 0.75) 100%)`;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    createGuideCard(step, targetEl) {
        let card = document.getElementById('pnl-guide-card');
        if (!card) {
            card = document.createElement('div');
            card.id = 'pnl-guide-card';
            card.className = 'fixed z-[100001] w-80 bg-white rounded-[2rem] shadow-2xl border-4 border-[#fba931] p-8 pnl-wizard-animate ring-[20px] ring-white/50';
            document.body.appendChild(card);
        }

        // Posicionamiento inteligente
        const rect = targetEl.getBoundingClientRect();
        card.style.top = `${rect.bottom + 30}px`;
        card.style.left = `${Math.max(20, rect.left + (rect.width / 2) - 160)}px`;

        if (parseInt(card.style.top) + 300 > window.innerHeight) {
            card.style.top = `${rect.top - 320}px`;
        }

        const sanitize = (html) => (window.sanitizeHTML ? window.sanitizeHTML(html) : html);
        card.innerHTML = sanitize(`
            <div class="flex justify-center mb-6">
                <img src="/public/assets/images/logos/pwa-icon-70.png" class="w-14 h-14 object-contain" alt="LSC">
            </div>
            <h3 class="text-xl font-900 uppercase text-center text-[#0f172a] mb-3 tracking-tighter">${step.title}</h3>
            <p class="text-sm font-bold text-slate-500 text-center leading-relaxed mb-6">${step.text}</p>
            
            <div class="flex items-center justify-between gap-3">
                <button id="guide-skip" class="text-[10px] font-900 uppercase text-slate-300 hover:text-red-400 py-2">Saltar</button>
                <button id="guide-next" class="bg-[#fba931] text-[#0f172a] px-8 py-3 rounded-full font-900 uppercase text-xs shadow-lg hover:scale-105 transition-all">
                    ${this.currentStep === this.context.steps.length - 1 ? '¡Listo!' : 'Siguiente'}
                </button>
            </div>

            <div class="mt-6 flex justify-center gap-1">
                ${this.context.steps.map((_, i) => `<div class="h-1.5 rounded-full transition-all ${i === this.currentStep ? 'w-6 bg-[#fba931]' : 'w-1.5 bg-slate-100'}"></div>`).join('')}
            </div>
        `);

        document.getElementById('guide-next').onclick = () => {
            this.currentStep++;
            this.showStep();
        };
        document.getElementById('guide-skip').onclick = () => this.finish();
    }

    finish() {
        const card = document.getElementById('pnl-guide-card');
        const spotlight = document.getElementById('pnl-spotlight');
        if (card) card.remove();
        if (spotlight) spotlight.style.opacity = '0';
        setTimeout(() => spotlight && spotlight.remove(), 500);
        localStorage.setItem('pnl_wizard_done', true);
    }
}

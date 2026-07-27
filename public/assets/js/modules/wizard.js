// 🧭 Wizard.js - Centro de Ayuda PNL Biobío
// Botón flotante (FAB) + panel con tips contextuales y accesos rápidos.
// El antiguo tour guiado (spotlight paso a paso) fue eliminado: dependía de
// selectores del markup que ya no existen y solo estaba definido para la portada.
export class PNLWizard {
    constructor() {
        this.context = this.getContextData();
    }

    start() {
        this.initHelpCenter();
    }

    /**
     * Tips contextuales según la página actual.
     * Se evalúa de lo más específico a lo más general (ojo: 'forja-foros-post'
     * también contiene 'forja-foros', por eso el orden importa).
     */
    getContextData() {
        const path = window.location.pathname;

        const contextos = [
            {
                match: (p) => p === '/' || p.includes('index.html'),
                data: {
                    title: 'Portal Biobío',
                    tips: [
                        'Revisa los comunicados oficiales al inicio.',
                        'Tu centro de acción es la Forja Libertaria.',
                        'Ingresa a la Academia para formarte.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja-academia'),
                data: {
                    title: 'Academia',
                    tips: [
                        'Los cursos se desbloquean por nivel: avanza en orden.',
                        'Cada lección completada suma puntos a tu rango.',
                        'Puedes retomar una lección donde la dejaste.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja-player'),
                data: {
                    title: 'Aula Virtual',
                    tips: [
                        'Mira la lección completa antes de rendir el quiz.',
                        'El progreso se guarda automáticamente.',
                        'Si fallas el quiz, puedes reintentarlo.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja-eventos'),
                data: {
                    title: 'Eventos',
                    tips: [
                        'Inscríbete con antelación: los cupos son limitados.',
                        'Revisa la fecha y el lugar antes de confirmar.',
                        'Asistir a eventos suma a tu racha de militancia.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja-foros-post'),
                data: {
                    title: 'Debate',
                    tips: [
                        'Responde con argumentos, no con descalificaciones.',
                        'Tus mensajes pasan por moderación automática.',
                        'Puedes editar tu respuesta si te equivocaste.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja-foros'),
                data: {
                    title: 'Foros Regionales',
                    tips: [
                        'Busca si el tema ya existe antes de abrir uno nuevo.',
                        'Elige la categoría correcta para tu publicación.',
                        'Participar en los foros suma puntos a tu rango.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja-votaciones'),
                data: {
                    title: 'Votaciones',
                    tips: [
                        'Tu voto es único y no se puede modificar después.',
                        'Lee la propuesta completa antes de decidir.',
                        'Revisa la fecha de cierre de cada votación.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja-login') || p.includes('forja-activar') || p.includes('forja-reset-password'),
                data: {
                    title: 'Acceso a la Forja',
                    tips: [
                        'Usa el correo con el que te registraste como afiliado.',
                        'Si no recibes el correo, revisa la carpeta de spam.',
                        'Nunca compartas tu contraseña con nadie.'
                    ]
                }
            },
            {
                match: (p) => p.includes('perfil'),
                data: {
                    title: 'Mi Perfil',
                    tips: [
                        'Mantén tus datos de contacto al día.',
                        'Desde aquí controlas tu privacidad y notificaciones.',
                        'Tu rango y tus logros reflejan tu actividad en la Forja.'
                    ]
                }
            },
            {
                match: (p) => p.includes('forja'),
                data: {
                    title: 'Forja Libertaria',
                    tips: [
                        'Aquí ves tu rango, tu racha y tus logros.',
                        'Entra a la Academia para seguir sumando puntos.',
                        'Revisa los foros y votaciones activas.'
                    ]
                }
            },
            {
                match: (p) => p.includes('contacto'),
                data: {
                    title: 'Contacto',
                    tips: [
                        'Describe tu consulta con el mayor detalle posible.',
                        'Deja un correo válido para poder responderte.',
                        'Respondemos en días hábiles.'
                    ]
                }
            },
            {
                match: (p) => p.includes('recursos'),
                data: {
                    title: 'Centro Multimedia',
                    tips: [
                        'Descarga el material y difúndelo en tus redes.',
                        'Filtra por tipo de recurso para encontrar más rápido.',
                        'Respeta la línea gráfica oficial del partido.'
                    ]
                }
            },
            {
                match: (p) => p.includes('publicaciones-oficiales'),
                data: {
                    title: 'Publicaciones',
                    tips: [
                        'Aquí está la postura oficial de la sede regional.',
                        'Comparte solo comunicados publicados en este portal.'
                    ]
                }
            },
            {
                match: (p) => p.includes('nosotros'),
                data: {
                    title: 'Sobre Nosotros',
                    tips: [
                        'Conoce la historia y los valores de la sede Biobío.',
                        '¿Quieres sumarte? Ingresa a la Forja Libertaria.'
                    ]
                }
            }
        ];

        const encontrado = contextos.find((c) => c.match(path));
        if (encontrado) return encontrado.data;

        return {
            title: 'Asistente LSC',
            tips: [
                'Explora el portal regional del Biobío.',
                'Usa Soporte si necesitas ayuda directa.'
            ]
        };
    }

    initHelpCenter() {
        if (document.getElementById('pnl-help-fab')) return;

        const fab = document.createElement('div');
        fab.id = 'pnl-help-fab';
        fab.className = 'fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[99999]';
        const sanitize = (html) => (window.sanitizeHTML ? window.sanitizeHTML(html) : html);
        fab.innerHTML = sanitize(`
            <div id="help-menu" class="hidden absolute bottom-20 right-0 md:bottom-24 w-[85vw] md:w-80 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.4)] border-4 border-[#fba931] p-6 md:p-8 overflow-hidden origin-bottom-right">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-10 h-10 md:w-12 md:h-12 bg-[#0f172a] rounded-full flex items-center justify-center border-2 border-[#fba931] flex-shrink-0">
                        <img src="/assets/images/logos/pwa-icon-70.png" class="w-6 h-6 md:w-8 md:h-8 object-contain" alt="PNL Biobío">
                    </div>
                    <div>
                        <!-- div y no h4: sanitizeHTML() no permite encabezados y borraría el estilo -->
                        <div id="pnl-help-title" class="text-xl md:text-2xl font-900 uppercase text-[#0f172a] tracking-tight leading-none">${this.context.title}</div>
                        <p class="text-[9px] md:text-[10px] font-black text-[#fba931] uppercase mt-1 tracking-widest">Asistente Regional</p>
                    </div>
                </div>

                <div class="space-y-4 text-left">
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
                        <button type="button" id="pnl-help-soporte" class="bg-slate-100 hover:bg-[#fba931]/10 p-3 rounded-2xl flex flex-col items-center gap-1 transition-all">
                            <span class="material-symbols-outlined text-[#0f172a] text-xl">support_agent</span>
                            <span class="text-[9px] font-black uppercase">Soporte</span>
                        </button>
                        <button type="button" id="pnl-help-academia" class="bg-slate-100 hover:bg-[#fba931]/10 p-3 rounded-2xl flex flex-col items-center gap-1 transition-all">
                            <span class="material-symbols-outlined text-[#0f172a] text-xl">school</span>
                            <span class="text-[9px] font-black uppercase">Academia</span>
                        </button>
                    </div>
                </div>
            </div>
            <button type="button" id="pnl-fab-btn" class="w-16 h-16 md:w-20 md:h-20 bg-[#0f172a] text-[#fba931] rounded-full shadow-[0_15px_40px_rgba(15,23,42,0.4)] flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-[#fba931]">
                <span class="material-symbols-outlined text-4xl md:text-5xl">psychology_alt</span>
            </button>
        `);
        document.body.appendChild(fab);

        const menu = fab.querySelector('#help-menu');
        const btn = fab.querySelector('#pnl-fab-btn');
        if (!menu || !btn) return;

        // Accesibilidad: los atributos aria/type se ponen por JS porque
        // sanitizeHTML() los elimina del string inicial.
        btn.setAttribute('aria-label', 'Abrir centro de ayuda');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'help-menu');

        const abrirMenu = (abierto) => {
            menu.classList.toggle('hidden', !abierto);
            btn.setAttribute('aria-expanded', String(abierto));
            btn.setAttribute('aria-label', abierto ? 'Cerrar centro de ayuda' : 'Abrir centro de ayuda');
        };

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirMenu(menu.classList.contains('hidden'));
        });

        // Cerrar al hacer clic fuera del FAB
        document.addEventListener('click', (e) => {
            if (!fab.contains(e.target)) abrirMenu(false);
        });

        // Cerrar con Escape (accesibilidad de teclado)
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || menu.classList.contains('hidden')) return;
            abrirMenu(false);
            btn.focus();
        });

        // Accesos rápidos: se enlazan con addEventListener porque sanitizeHTML()
        // elimina cualquier atributo onclick inline.
        const accesos = [
            ['#pnl-help-soporte', '/contacto.html'],
            ['#pnl-help-academia', '/forja-academia.html']
        ];
        accesos.forEach(([selector, destino]) => {
            const acceso = fab.querySelector(selector);
            if (acceso) acceso.addEventListener('click', () => { window.location.href = destino; });
        });
    }
}

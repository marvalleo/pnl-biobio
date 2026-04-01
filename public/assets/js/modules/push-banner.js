/**
 * 🔔 PUSH PERMISSION BANNER
 * PNL Biobío - Digital Platform
 * Usa estilos inline para ser independiente de Tailwind/build process
 */

// isDenied = true → modo informativo cuando el permiso ya fue rechazado
export function showPushPermissionBanner(onAccept, isDenied = false) {
    const sessionKey = isDenied ? 'push-denied-banner-dismissed' : 'push-banner-dismissed';
    if (sessionStorage.getItem(sessionKey) === 'true') return;
    if (document.getElementById('push-banner')) return; // Evitar duplicados

    // Delay de 3 segundos para no interrumpir la carga
    setTimeout(() => {
        const banner = document.createElement('div');
        banner.id = 'push-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 1.5rem;
            left: 1rem;
            right: 1rem;
            z-index: 9999;
            background: #0f172a;
            color: white;
            padding: 1.25rem;
            border-radius: 1.5rem;
            box-shadow: 0 25px 50px rgba(0,0,0,0.4);
            border: 1px solid #1e293b;
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
            animation: slideUpBanner 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        `;

        const icon = isDenied ? '🔕' : '🔔';
        const title = isDenied ? 'Notificaciones Bloqueadas' : 'Activar Notificaciones';
        const message = isDenied
            ? 'Habilitaste el bloqueo antes. Para recibir avisos, ve a <b>Configuración del navegador → Notificaciones → nacionallibertariobiobio.cl</b> y cambia a "Permitir".'
            : 'Recibe avisos al instante sobre nuevas votaciones, clases y debates en el foro.';
        const acceptLabel = isDenied ? 'Entendido' : 'Activar';
        const dismissLabel = isDenied ? 'Cerrar' : 'Ahora no';

        const sanitize = (html) => (window.sanitizeHTML ? window.sanitizeHTML(html) : html);
        banner.innerHTML = sanitize(`
            <style>
                @keyframes slideUpBanner {
                    from { transform: translateY(120%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            </style>
            <div style="background:#1e293b; padding:0.75rem; border-radius:1rem; font-size:1.5rem; flex-shrink:0;">${icon}</div>
            <div style="flex:1;">
                <h3 style="font-weight:900; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 0.25rem 0;">
                    ${title}
                </h3>
                <p style="font-size:0.65rem; color:#94a3b8; margin:0 0 1rem 0; line-height:1.6;">
                    ${message}
                </p>
                <div style="display:flex; gap:0.5rem;">
                    <button id="push-btn-accept" style="background:${isDenied ? '#1e293b' : '#fba931'}; color:${isDenied ? 'white' : '#0f172a'}; border:none; padding:0.5rem 1rem; border-radius:0.75rem; font-size:0.65rem; font-weight:900; text-transform:uppercase; cursor:pointer; flex:1;">
                        ${acceptLabel}
                    </button>
                    <button id="push-btn-dismiss" style="background:transparent; color:#64748b; border:none; padding:0.5rem 1rem; border-radius:0.75rem; font-size:0.65rem; font-weight:900; text-transform:uppercase; cursor:pointer;">
                        ${dismissLabel}
                    </button>
                </div>
            </div>
        `);

        document.body.appendChild(banner);

        const removeBanner = () => {
            banner.style.transform = 'translateY(120%)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            setTimeout(() => banner.remove(), 300);
        };

        document.getElementById('push-btn-accept').onclick = async () => {
            removeBanner();
            if (!isDenied && onAccept) await onAccept();
            else sessionStorage.setItem(sessionKey, 'true');
        };

        document.getElementById('push-btn-dismiss').onclick = () => {
            removeBanner();
            sessionStorage.setItem(sessionKey, 'true');
        };
    }, 3000);
}

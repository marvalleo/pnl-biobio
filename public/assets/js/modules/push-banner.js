/**
 * 🔔 PUSH PERMISSION BANNER
 * PNL Biobío - Digital Platform
 * Usa estilos inline para ser independiente de Tailwind/build process
 */

export function showPushPermissionBanner(onAccept) {
    if (sessionStorage.getItem('push-banner-dismissed') === 'true') return;
    if (document.getElementById('push-banner')) return; // Evitar duplicados

    // Delay de 3 segundos para no interrumpir la carga de la página
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
            margin: 0 auto;
            animation: slideUpBanner 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        `;

        banner.innerHTML = `
            <style>
                @keyframes slideUpBanner {
                    from { transform: translateY(120%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            </style>
            <div style="background:#1e293b; padding:0.75rem; border-radius:1rem; font-size:1.5rem; flex-shrink:0;">🔔</div>
            <div style="flex:1;">
                <h3 style="font-weight:900; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 0.25rem 0;">
                    Activar Notificaciones
                </h3>
                <p style="font-size:0.65rem; color:#94a3b8; margin:0 0 1rem 0; line-height:1.5;">
                    Recibe avisos al instante sobre nuevas votaciones, clases y debates en el foro.
                </p>
                <div style="display:flex; gap:0.5rem;">
                    <button id="push-btn-accept" style="background:#fba931; color:#0f172a; border:none; padding:0.5rem 1rem; border-radius:0.75rem; font-size:0.65rem; font-weight:900; text-transform:uppercase; cursor:pointer; flex:1; transition:background 0.2s;">
                        Activar
                    </button>
                    <button id="push-btn-dismiss" style="background:transparent; color:#64748b; border:none; padding:0.5rem 1rem; border-radius:0.75rem; font-size:0.65rem; font-weight:900; text-transform:uppercase; cursor:pointer;">
                        Ahora no
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('push-btn-accept').onclick = async () => {
            banner.style.animation = 'none';
            banner.style.transform = 'translateY(120%)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            setTimeout(() => banner.remove(), 300);
            if (onAccept) await onAccept();
        };

        document.getElementById('push-btn-dismiss').onclick = () => {
            banner.style.animation = 'none';
            banner.style.transform = 'translateY(120%)';
            banner.style.opacity = '0';
            banner.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            setTimeout(() => banner.remove(), 300);
            sessionStorage.setItem('push-banner-dismissed', 'true');
        };
    }, 3000);
}

/**
 * 🔔 PUSH PERMISSION BANNER
 * PNL Biobío - Digital Platform
 */

export function showPushPermissionBanner(onAccept) {
    if (sessionStorage.getItem('push-banner-dismissed') === 'true') return;

    const banner = document.createElement('div');
    banner.id = 'push-banner';
    banner.className = 'fixed bottom-4 left-4 right-4 z-[9999] bg-[#0f172a] text-white p-5 rounded-3xl shadow-2xl border border-gray-800 animate-slide-up md:max-w-sm md:left-auto md:right-8';

    banner.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="bg-[#1e293b] p-3 rounded-2xl text-2xl">🔔</div>
            <div class="flex-1">
                <h3 class="font-black text-xs uppercase tracking-wider mb-1">Activar Notificaciones</h3>
                <p class="text-[11px] text-gray-400 mb-4 font-medium leading-normal">
                    Recibe avisos al instante sobre nuevas votaciones, clases y debates en el foro.
                </p>
                <div class="flex gap-2">
                    <button id="push-btn-accept" class="bg-[#fba931] text-[#0f172a] px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-yellow-400 transition-all flex-1">
                        Activar
                    </button>
                    <button id="push-btn-dismiss" class="bg-transparent text-gray-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:text-white transition-all">
                        Ahora no
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('push-btn-accept').onclick = async () => {
        banner.remove();
        if (onAccept) await onAccept();
    };

    document.getElementById('push-btn-dismiss').onclick = () => {
        banner.remove();
        sessionStorage.setItem('push-banner-dismissed', 'true');
    };
}

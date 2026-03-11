/**
 * 🍎 iOS INSTALL PROMPT
 * PNL Biobío - Digital Platform
 */

export function showIOSInstallPrompt() {
    if (sessionStorage.getItem('ios-prompt-closed') === 'true') return;

    const prompt = document.createElement('div');
    prompt.id = 'ios-install-prompt';
    prompt.className = 'fixed bottom-4 left-4 right-4 z-[9999] bg-[#0f172a] text-white p-6 rounded-3xl shadow-2xl border border-gray-800 animate-slide-up md:max-w-md md:left-auto md:right-8';

    prompt.innerHTML = `
        <div class="relative">
            <button id="close-ios-prompt" class="absolute -top-2 -right-2 text-gray-400 hover:text-white p-2">✕</button>
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2">
                    <img src="/assets/images/logos/favicon-100x100.jpg" alt="Logo" class="w-full h-full object-contain">
                </div>
                <div>
                    <h3 class="font-black text-sm uppercase tracking-tighter">Instalar PNL Biobío</h3>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Activación de Notificaciones</p>
                </div>
            </div>
            <p class="text-xs text-gray-300 mb-6 leading-relaxed">
                En iOS, debes añadir la aplicación a tu pantalla de inicio para recibir avisos de votaciones y clases.
            </p>
            <div class="space-y-4">
                <div class="flex items-center gap-4 text-xs">
                    <div class="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center font-bold text-[#fba931]">1</div>
                    <p>Pulsa el botón de <span class="bg-[#2d3748] px-2 py-0.5 rounded font-bold">Compartir</span> (cuadrado con flecha).</p>
                </div>
                <div class="flex items-center gap-4 text-xs">
                    <div class="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center font-bold text-[#fba931]">2</div>
                    <p>Busca <span class="bg-[#2d3748] px-2 py-0.5 rounded font-bold">"Añadir a inicio"</span>.</p>
                </div>
                <div class="flex items-center gap-4 text-xs">
                    <div class="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center font-bold text-[#fba931]">3</div>
                    <p>Presiona <span class="text-[#fba931] font-bold uppercase">Añadir</span> en la esquina superior.</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(prompt);

    document.getElementById('close-ios-prompt').onclick = () => {
        prompt.classList.add('animate-fade-out');
        setTimeout(() => {
            prompt.remove();
            sessionStorage.setItem('ios-prompt-closed', 'true');
        }, 300);
    };

    if (!document.getElementById('push-animations')) {
        const style = document.createElement('style');
        style.id = 'push-animations';
        style.textContent = `
            @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
            .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
            .animate-fade-out { animation: fade-out 0.3s forwards; }
        `;
        document.head.appendChild(style);
    }
}

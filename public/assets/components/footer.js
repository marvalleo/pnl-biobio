class PnlFooter extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const currentYear = new Date().getFullYear();
        this.innerHTML = `
            <footer class="py-12 px-5 bg-[#0f172a] mt-auto flex flex-col justify-center items-center w-full relative z-50 shrink-0">
                <img src="/assets/images/logos/logo-footer.png" alt="Partido Nacional Libertario" class="h-14 md:h-20 mb-8 opacity-90 hover:opacity-100 transition-opacity">
                <div class="w-full max-w-7xl text-center border-t border-white/10 pt-6">
                    <p class="text-[10px] md:text-xs font-bold uppercase tracking-[0.1em] text-slate-400 m-0 text-center">
                        &copy; ${currentYear} Partido Nacional Libertario - Sede Regional Biobío
                    </p>
                </div>
            </footer>
        `;
    }
}

customElements.define('pnl-footer', PnlFooter);

function b(e,t="info"){const a=document.getElementById("pnl-toast");a&&a.remove();const o=document.createElement("div");o.id="pnl-toast";const n="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl font-900 text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all duration-500 opacity-0 translate-y-10",i={success:"bg-green-500 text-white",error:"bg-red-600 text-white",info:"bg-[#0f172a] text-white",warning:"bg-[#fba931] text-[#0f172a]"},s={success:"check_circle",error:"error",info:"info",warning:"warning"};o.className=`${n} ${i[t]||i.info}`,o.innerHTML=`
        <span class="material-symbols-outlined text-lg">${s[t]||"info"}</span>
        ${e}
    `,document.body.appendChild(o),setTimeout(()=>{o.style.opacity="1",o.style.transform="translate(-50%, 0)"},10),setTimeout(()=>{o.style.opacity="0",o.style.transform="translate(-50%, 20px)",setTimeout(()=>o.remove(),500)},4e3)}function x(){const e=document.getElementById("user-dropdown");e&&e.classList.toggle("hidden")}window.addEventListener("click",e=>{const t=document.getElementById("user-dropdown"),a=document.getElementById("user-menu-container");t&&!t.classList.contains("hidden")&&a&&!a.contains(e.target)&&t.classList.add("hidden")});function h(e,t,a="Procesando"){e&&(e.dataset.originalHtml||(e.dataset.originalHtml=e.innerHTML),t?(e.disabled=!0,e.classList.add("opacity-70","cursor-wait"),e.innerHTML=`
            <span class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full shrink-0"></span>
            <span>${a}</span>
        `):(e.disabled=!1,e.classList.remove("opacity-70","cursor-wait"),e.innerHTML=e.dataset.originalHtml))}async function d(){if(!window.isSupabaseInit){if(console.warn("initNavbar: Supabase no está configurado."),!document.getElementById("pnl-config-warning")){const a=document.createElement("div");a.id="pnl-config-warning",a.className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase py-2 px-4 shadow-xl z-[9000] text-center flex justify-center items-center gap-4",a.innerHTML=`
                <span>⚠️ Error de Configuración: Supabase no detectado en Local</span>
                <button onclick="localStorage.setItem('SUPABASE_URL', prompt('URL Supabase:')); localStorage.setItem('SUPABASE_ANON_KEY', prompt('Anon Key:')); location.reload();" 
                        class="bg-white text-red-600 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors">
                    Configurar Ahora
                </button>
            `,document.body.appendChild(a)}return}const e=document.getElementById("user-menu-container"),t=document.getElementById("admin-link-container");if(e)try{const{data:{user:a}}=await window.supabaseClient.auth.getUser();if(!a)return;let o=JSON.parse(sessionStorage.getItem("pnl_profile"));if(!o){const{data:s}=await window.supabaseClient.from("profiles").select("full_name, role").eq("auth_id",a.id).single();o=s,o&&sessionStorage.setItem("pnl_profile",JSON.stringify(o))}const n=o?.full_name||a.user_metadata?.full_name||a.email||"Miembro",i=n.split(" ").map(s=>s[0]).join("").substring(0,2).toUpperCase();t&&["super_admin","admin_forja","admin_votos","admin_foros","admin_usuarios"].includes(o?.role)&&t.classList.remove("hidden"),e.innerHTML=`
            <div class="relative">
                <button onclick="toggleUserMenu()" class="w-10 h-10 rounded-full bg-[#fba931] text-[#0f172a] font-900 text-xs border-2 border-white shadow-sm hover:scale-105 transition-all flex items-center justify-center">
                    ${i}
                </button>
                <div id="user-dropdown" class="hidden absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[100]">
                    <div class="px-5 py-3 border-b border-gray-50 mb-2">
                        <p class="text-[8px] font-black uppercase text-[#fba931] tracking-widest leading-none mb-1">Sesión Iniciada</p>
                        <p class="text-xs font-black text-[#0f172a] truncate">${n}</p>
                    </div>
                    
                    <a href="perfil.html" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-[#0f172a] hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 mb-1">
                        <span class="material-symbols-outlined text-lg">admin_panel_settings</span> Mi Perfil / Privacidad
                    </a>

                    <button onclick="logout()" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <span class="material-symbols-outlined text-lg">logout</span> Cerrar Sesión
                    </button>
                </div>
            </div>
        `}catch(a){console.error("Navbar init error:",a)}}async function v(){try{window.isSupabaseInit&&window.supabaseClient&&await window.supabaseClient.auth.signOut()}catch(e){console.warn("Error durante signOut de Supabase:",e)}localStorage.clear(),sessionStorage.clear(),window.location.href="index.html"}function y(e){if(!e)return!1;let t=e.replace(/\./g,"").replace(/-/g,"");if(t.length<8)return!1;let a=t.slice(0,-1),o=t.slice(-1).toUpperCase(),n=0,i=2;for(let r=1;r<=a.length;r++)n=n+i*t.charAt(a.length-r),i<7?i=i+1:i=2;let s=11-n%11;return s=s===11?"0":s===10?"K":s.toString(),o===s}function u(e){const{title:t,content:a,image_url:o,cta_text:n,cta_url:i,id:s}=e;if(document.getElementById("impact-modal-overlay"))return;const r=document.createElement("div");r.id="impact-modal-overlay",r.className="fixed inset-0 bg-black/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4 opacity-0 transition-opacity duration-500 text-left";const l=document.createElement("div");l.className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative translate-y-20 transition-transform duration-500 border border-white/20";const g='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',f='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',w=o?`
        <div class="h-64 sm:h-80 w-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
            <img src="${o}" 
                 id="impact-modal-img"
                 class="w-full h-full object-cover transition-opacity duration-700 opacity-0" 
                 onload="this.classList.remove('opacity-0'); console.log('PNL Image: Imagen cargada con éxito')"
                 onerror="handleModalImageError(this, '${o}')">
            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
            <!-- Spinner / Loader -->
            <div id="img-loader" class="absolute inset-0 flex items-center justify-center bg-slate-50">
                 <div class="w-8 h-8 border-4 border-[#fba931] border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>`:'<div class="h-10 bg-[#0f172a]"></div>';if(l.innerHTML=`
        ${w}
        
        <button onclick="closeImpactModal('${s}', false)" 
                title="Cerrar por ahora"
                class="absolute top-6 right-6 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10">
            ${g}
        </button>

        <div class="p-8 sm:p-10 text-center">
            <h2 class="serif text-3xl sm:text-4xl text-[#0f172a] mb-6 leading-tight">${t}</h2>
            <div class="text-xs sm:text-sm text-gray-500 mb-8 leading-relaxed font-medium max-h-48 overflow-y-auto custom-scrollbar">
                ${a.replace(/\\n/g,"<br>").replace(/\n/g,"<br>")}
            </div>
            
            <div class="flex flex-col gap-6 items-center">
                ${i?`
                <div class="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <a href="${i}" target="_blank"
                       class="px-8 py-4 bg-[#fba931] text-[#0f172a] rounded-2xl font-900 text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-3 min-w-[140px]">
                        ${n||"Entrar al Enlace"} ${f}
                    </a>
                </div>`:""}

                ${e.contact_email||e.contact_whatsapp?`
                <div class="flex flex-wrap items-center justify-center gap-4 border-t border-gray-100 pt-6 w-full mt-2">
                    ${e.contact_email?`
                    <div class="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-left cursor-pointer hover:bg-slate-100 transition-colors active:scale-95" 
                         onclick="navigator.clipboard.writeText('${e.contact_email}'); const s = this.querySelector('.email-val'); const o = '${e.contact_email}'; s.innerText='¡Copiado al portapapeles!'; setTimeout(() => s.innerText=o, 2000);"
                         title="Clic para copiar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-gray-400 shrink-0" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <div>
                            <span class="block text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Copiar Correo</span>
                            <span class="email-val text-[11px] font-bold text-[#fba931]">${e.contact_email}</span>
                        </div>
                    </div>`:""}

                    ${e.contact_whatsapp?`
                    <a href="https://wa.me/${e.contact_whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent("Hola, me comunico por este anuncio: "+t)}" target="_blank"
                       class="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-6 py-3 rounded-xl transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.4 8.38 8.38 0 0 1 3.9 1.1L21 4z"></path></svg>
                        <span class="text-[10px] font-black uppercase tracking-widest">Enviar WhatsApp</span>
                    </a>`:""}
                </div>`:""}
                
                <button onclick="closeImpactModal('${s}', true)" 
                        class="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors">
                    No volver a ver este anuncio
                </button>
            </div>
        </div>
    `,r.appendChild(l),document.body.appendChild(r),setTimeout(()=>{r.classList.remove("opacity-0"),l.classList.remove("translate-y-20"),l.classList.add("translate-y-0")},100),o){const c=document.getElementById("impact-modal-img"),m=document.getElementById("img-loader");c&&(c.complete?(m?.remove(),c.classList.remove("opacity-0")):c.onload=()=>{m?.remove(),c.classList.remove("opacity-0"),console.log("PNL Image: Imagen cargada (evento)")})}}function k(e,t){console.error("PNL Image Error: No se pudo cargar la imagen",t);const a=e.parentElement;document.getElementById("img-loader")?.remove(),a.innerHTML=`
        <div class="w-full h-full bg-[#0f172a] flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <span class="serif text-4xl text-white opacity-20 italic">PNL Biobío</span>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
        </div>
    `}function _(e,t=!1){const a=document.getElementById("impact-modal-overlay"),o=a?.querySelector("div");if(a&&o){if(o.classList.add("translate-y-20"),a.classList.add("opacity-0"),e)if(t){const n=JSON.parse(localStorage.getItem("pnl_viewed_announcements")||"[]");n.includes(e)||(n.push(e),localStorage.setItem("pnl_viewed_announcements",JSON.stringify(n))),console.log("PNL Biobío: Anuncio descartado permanentemente.")}else{const n=JSON.parse(sessionStorage.getItem("pnl_session_dismissed")||"[]");n.includes(e)||(n.push(e),sessionStorage.setItem("pnl_session_dismissed",JSON.stringify(n))),console.log("PNL Biobío: Anuncio cerrado por ahora (sesión).")}setTimeout(()=>a.remove(),500)}}async function p(){let e=0;for(;!window.isSupabaseInit&&e<20;)await new Promise(t=>setTimeout(t,500)),e++;if(!window.isSupabaseInit||!window.supabaseClient){console.warn("Anuncios: Supabase no se inicializó a tiempo.");return}try{console.log("PNL Biobío: Buscando anuncios activos...");const{data:t,error:a}=await window.supabaseClient.from("regional_announcements").select("*").eq("is_active",!0).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(a)throw a;if(!t){console.log("PNL Biobío: No hay anuncios activos ahora mismo.");return}console.log("PNL Biobío: Anuncio encontrado:",t.title);const o=window.location.search.includes("test=1");if(JSON.parse(localStorage.getItem("pnl_viewed_announcements")||"[]").includes(t.id)&&!o){console.log("PNL Biobío: El usuario ya vio este anuncio (Permanente). No se muestra.");return}if(JSON.parse(sessionStorage.getItem("pnl_session_dismissed")||"[]").includes(t.id)&&!o){console.log("PNL Biobío: El anuncio fue cerrado en esta sesión. No se muestra.");return}if(t.expires_at&&new Date(t.expires_at)<new Date){console.log("PNL Biobío: El anuncio ha expirado.");return}if(t.target_audience==="militants"){const{data:{user:r}}=await window.supabaseClient.auth.getUser();if(!r){console.log("PNL Biobío: Anuncio restringido a militantes (no logueado).");return}}const s={...t};console.log("PNL Biobío: Disparando modal de impacto..."),setTimeout(()=>u(s),1500)}catch(t){console.warn("Error al comprobar anuncios:",t)}}window.showToast=b;window.toggleUserMenu=x;window.setButtonLoading=h;window.logout=v;window.initNavbar=d;window.validateRUT=y;window.showImpactModal=u;window.handleModalImageError=k;window.closeImpactModal=_;window.checkAndShowAnnouncements=p;document.readyState==="loading"?window.addEventListener("DOMContentLoaded",()=>{d(),p()}):(d(),p());

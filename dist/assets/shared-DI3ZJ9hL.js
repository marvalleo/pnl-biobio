function N(s,e="info"){const t=document.getElementById("pnl-toast");t&&t.remove();const a=document.createElement("div");a.id="pnl-toast";const o="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl font-900 text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all duration-500 opacity-0 translate-y-10",r={success:"bg-green-500 text-white",error:"bg-red-600 text-white",info:"bg-[#0f172a] text-white",warning:"bg-[#fba931] text-[#0f172a]"},i={success:"check_circle",error:"error",info:"info",warning:"warning"};a.className=`${o} ${r[e]||r.info}`,a.innerHTML=`
        <span class="material-symbols-outlined text-lg">${i[e]||"info"}</span>
        ${s}
    `,document.body.appendChild(a),setTimeout(()=>{a.style.opacity="1",a.style.transform="translate(-50%, 0)"},10),setTimeout(()=>{a.style.opacity="0",a.style.transform="translate(-50%, 20px)",setTimeout(()=>a.remove(),500)},4e3)}function _(){const s=document.getElementById("user-dropdown");s&&s.classList.toggle("hidden")}window.addEventListener("click",s=>{const e=document.getElementById("user-dropdown"),t=document.getElementById("user-menu-container");e&&!e.classList.contains("hidden")&&t&&!t.contains(s.target)&&e.classList.add("hidden")});function M(s,e,t="Procesando"){s&&(s.dataset.originalHtml||(s.dataset.originalHtml=s.innerHTML),e?(s.disabled=!0,s.classList.add("opacity-70","cursor-wait"),s.innerHTML=`
            <span class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full shrink-0"></span>
            <span>${t}</span>
        `):(s.disabled=!1,s.classList.remove("opacity-70","cursor-wait"),s.innerHTML=s.dataset.originalHtml))}function S(s,e,t){return Promise.race([s,new Promise(a=>setTimeout(()=>a(t),e))])}async function P(){if(!window.isSupabaseInit){if(console.warn("initNavbar: Supabase no está configurado."),!document.getElementById("pnl-config-warning")){const t=document.createElement("div");t.id="pnl-config-warning",t.className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-black uppercase py-2 px-4 shadow-xl z-[9000] text-center flex justify-center items-center gap-4",t.innerHTML=`
                <span>⚠️ Error de Configuración: Supabase no detectado en Local</span>
                <button onclick="localStorage.setItem('SUPABASE_URL', prompt('URL Supabase:')); localStorage.setItem('SUPABASE_ANON_KEY', prompt('Anon Key:')); location.reload();" 
                        class="bg-white text-red-600 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors">
                    Configurar Ahora
                </button>
            `,document.body.appendChild(t)}return}const s=document.getElementById("user-menu-container"),e=document.getElementById("admin-link-container");if(s)try{const{data:{user:t}}=await window.supabaseClient.auth.getUser();if(!t)return;let a=JSON.parse(sessionStorage.getItem("pnl_profile"));if(!a){const{data:d}=await window.supabaseClient.from("profiles").select("full_name, role").eq("auth_id",t.id).single();a=d,a&&sessionStorage.setItem("pnl_profile",JSON.stringify(a))}const o=a?.full_name||t.user_metadata?.full_name||t.email||"Miembro",r=o.split(" ").map(d=>d[0]).join("").substring(0,2).toUpperCase();e&&["super_admin","admin_forja","admin_votos","admin_foros","admin_usuarios"].includes(a?.role)&&e.classList.remove("hidden");let i=0,u=!1,n="default",c=!1;try{if(n=typeof Notification<"u"?Notification.permission:"default",window.pushManager&&(c=window.pushManager.checkSupport(),c)){const[d,g]=await Promise.all([S(window.pushManager.getUnreadCount(),2e3,0),S(window.pushManager.isSubscribed(),2e3,!1)]);i=d,u=n==="granted"&&g}}catch{}const m=i>0?`<span id="notif-badge" style="
                position:absolute; top:-4px; right:-4px;
                background:#ef4444; color:white;
                border-radius:9999px; width:18px; height:18px;
                font-size:9px; font-weight:900;
                display:flex; align-items:center; justify-content:center;
                border:2px solid white; line-height:1;
                pointer-events:none;
              ">${i>9?"9+":i}</span>`:"",p=C(u,n,c);s.innerHTML=`
            <style>
                #push-toggle-thumb { transition: transform 0.2s ease; }
            </style>
            <div class="relative" id="user-menu-wrapper">
                <button id="user-avatar-btn"
                        style="position:relative; display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9999px; background:#fba931; color:#0f172a; font-size:11px; font-weight:900; border:2px solid white; box-shadow:0 1px 4px rgba(0,0,0,0.15); cursor:pointer; flex-shrink:0;">
                    ${r}
                    ${m}
                </button>
                <div id="user-dropdown" class="hidden absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-[100]"
                     style="min-width:240px;">
                    <div class="px-5 py-3 border-b border-gray-50 mb-2">
                        <p class="text-[8px] font-black uppercase text-[#fba931] tracking-widest leading-none mb-1">Sesión Iniciada</p>
                        <p class="text-xs font-black text-[#0f172a] truncate">${o}</p>
                    </div>
                    
                    <a href="perfil.html" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-[#0f172a] hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50">
                        <span class="material-symbols-outlined text-lg">admin_panel_settings</span> Mi Perfil / Privacidad
                    </a>

                    ${p}

                    <button id="show-notif-history-btn" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-blue-500 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b border-gray-50">
                        <span class="material-symbols-outlined text-lg">history</span> Bandeja de Entrada
                    </button>

                    <button id="show-pwa-logs-btn" class="hidden w-full text-left px-5 py-3 text-[10px] font-black uppercase text-indigo-500 hover:bg-indigo-50 items-center gap-3 transition-colors border-b border-gray-50">
                        <span class="material-symbols-outlined text-lg">bug_report</span> Ver Logs (Debug)
                    </button>

                    <button onclick="logout()" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <span class="material-symbols-outlined text-lg">logout</span> Cerrar Sesión
                    </button>
                </div>
            </div>
        `,window.updateUnreadCount=async()=>{try{if(!window.supabaseClient)return;const{data:d,error:g}=await window.supabaseClient.rpc("get_my_push_history",{max_records:50});if(g||!d)return;let b=[];try{b=JSON.parse(localStorage.getItem("pnl_read_notifs")||"[]")}catch{}const y=d.filter(L=>!b.includes(L.id)).length,v=document.getElementById("user-avatar-btn");if(!v)return;let h=document.getElementById("notif-badge");if(y>0){const L=y>9?"9+":y;h||(h=document.createElement("span"),h.id="notif-badge",h.style.cssText=`
                            position:absolute; top:-4px; right:-4px;
                            background:#ef4444; color:white;
                            border-radius:9999px; width:18px; height:18px;
                            font-size:9px; font-weight:900;
                            display:flex; align-items:center; justify-content:center;
                            border:2px solid white; line-height:1;
                            pointer-events:none; transition: all 0.3s ease;
                        `,v.appendChild(h)),h.textContent=L,h.style.opacity="1",h.style.transform="scale(1)"}else h&&(h.style.opacity="0",h.style.transform="scale(0.5)",setTimeout(()=>h.remove(),300))}catch(d){console.error("Error updating unread count:",d)}};const l=document.getElementById("user-avatar-btn");l&&l.addEventListener("click",d=>{d.stopPropagation();const g=document.getElementById("user-dropdown");g&&g.classList.toggle("hidden")}),window.updateUnreadCount(),document.addEventListener("click",d=>{const g=document.getElementById("user-menu-wrapper"),b=document.getElementById("user-dropdown");b&&g&&!g.contains(d.target)&&b.classList.add("hidden")}),B(u,n,c);const f=document.getElementById("show-notif-history-btn");f&&f.addEventListener("click",d=>{d.stopPropagation();const g=document.getElementById("user-dropdown");g&&g.classList.add("hidden"),window.showNotificationHistory&&window.showNotificationHistory()});const w=document.getElementById("show-pwa-logs-btn");w&&w.addEventListener("click",d=>{d.stopPropagation(),window.showPWALogs&&window.showPWALogs()})}catch(t){console.error("Navbar init error:",t)}}function C(s,e,t=!0){const a=s&&t?"#22c55e":"#e2e8f0",o=s&&t?"translateX(18px)":"translateX(2px)";let r="Inactivo",i="#94a3b8",u="1",n="pointer",c=s?"Desactivar notificaciones":"Activar notificaciones";return t?s?(r="Activado",i="#22c55e"):e==="denied"&&(r="Bloqueado en navegador",i="#ef4444",u="0.5",n="not-allowed",c="Ve a la configuración del navegador para habilitarlas."):(r="No compatible o en Incógnito",i="#f59e0b",u="0.5",n="not-allowed",c="Actualiza tu navegador, quita el modo incógnito, o instala la PWA para usar notificaciones."),`
        <div class="px-5 py-3 border-b border-gray-50 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="material-symbols-outlined text-lg text-gray-400 shrink-0">notifications</span>
                <div class="min-w-0">
                    <p class="text-[10px] font-black uppercase text-gray-700 leading-none mb-0.5">Notificaciones</p>
                    <p id="push-toggle-status" style="font-size:9px; font-weight:700; color:${i}; margin:0; line-height:1.3;">${r}</p>
                </div>
            </div>
            <button id="push-toggle-btn"
                    title="${c}"
                    style="width:40px; height:22px; border:none; cursor:${n}; border-radius:9999px; background:${a}; position:relative; flex-shrink:0; padding:0; opacity:${u}; overflow:hidden;">
                <span id="push-toggle-thumb" style="position:absolute; top:2px; left:0; width:18px; height:18px; background:white; border-radius:9999px; box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:transform 0.2s ease; transform:${o};"></span>
            </button>
        </div>
    `}function B(s,e,t=!0){let a=s&&t;setTimeout(()=>{const o=document.getElementById("push-toggle-btn");o&&o.addEventListener("click",async r=>{r.stopPropagation();let i=localStorage.getItem("pnlPushLogs")||"[]",u=[];try{u=JSON.parse(i)}catch{}const n=l=>{console.log(l),u.push(new Date().toLocaleTimeString()+" - "+l),localStorage.setItem("pnlPushLogs",JSON.stringify(u.slice(-30)))};if(window.pnlLog=n,window.showPWALogs=()=>{let l=[];try{l=JSON.parse(localStorage.getItem("pnlPushLogs")||"[]")}catch{}const f='<div class="text-left text-[10px] font-mono bg-slate-900 text-emerald-400 p-3 rounded-lg max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words border border-slate-700">'+(l.length?l.join("<br>"):"No hay logs aún.")+"</div>",w=document.getElementById("pwa-debug-modal");w&&w.remove();const d=document.createElement("div");d.id="pwa-debug-modal",d.className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",d.innerHTML=`
                    <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg md:max-w-2xl overflow-hidden transform transition-all duration-300 border border-slate-100/50">
                        <div class="relative bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                            <h3 class="text-sm font-black uppercase tracking-widest text-[#fba931] flex items-center gap-2">
                                <span class="material-symbols-outlined text-lg">bug_report</span> 
                                PWA Console
                            </h3>
                            <button id="pwa-debug-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                                <span class="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        <div class="p-5 md:p-8 bg-slate-50">
                            ${f}
                            <div class="mt-4 flex flex-col gap-2">
                                <button id="pwa-debug-copy" class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-base">content_copy</span> Copiar todo el texto
                                </button>
                                <button id="pwa-debug-clear" class="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-base">delete</span> Limpiar Logs
                                </button>
                            </div>
                        </div>
                    </div>
                `,document.body.appendChild(d),document.getElementById("pwa-debug-close").addEventListener("click",()=>d.remove()),document.getElementById("pwa-debug-copy").addEventListener("click",async()=>{try{let g=l.join("\\n");g||(g="No hay logs aún."),await navigator.clipboard.writeText(g);const b=document.getElementById("pwa-debug-copy");b.innerHTML='<span class="material-symbols-outlined text-base">check</span> ¡Copiado!',b.classList.replace("bg-blue-500","bg-emerald-500"),b.classList.replace("hover:bg-blue-600","hover:bg-emerald-600"),setTimeout(()=>{b.innerHTML='<span class="material-symbols-outlined text-base">content_copy</span> Copiar todo el texto',b.classList.replace("bg-emerald-500","bg-blue-500"),b.classList.replace("hover:bg-emerald-600","hover:bg-blue-600")},2e3)}catch(g){alert("Error al copiar: "+g)}}),document.getElementById("pwa-debug-clear").addEventListener("click",()=>{localStorage.removeItem("pnlPushLogs"),u=[],d.remove(),window.showPWALogs()})},n("PNL Push: [PWA DEBUG] Toggle presionado."),n(`PNL Push: Estado: toggleState=${a} | permStatus=${e} | isSupported=${t}`),!t){n("PNL Push: ALERTA - pushManager.checkSupport() retornó FALSE."),n("PNL Push: El API no está soportado en este navegador o contexto (HTTP inseguro, modo incógnito, in-app).");return}if(e==="denied"){n("PNL Push: Permiso está denegado a nivel navegador.");const l=document.getElementById("push-toggle-status");l&&(l.textContent="Ve a Configuración del navegador",l.style.color="#f59e0b");return}const c=document.getElementById("push-toggle-btn"),m=document.getElementById("push-toggle-thumb"),p=document.getElementById("push-toggle-status");c&&(c.style.opacity="0.5");try{if(a)n("PNL Push: Intentando desuscribir..."),await window.pushManager.unsubscribe(),n("PNL Push: Desuscripción completada."),m&&(m.style.transform="translateX(2px)"),c&&(c.style.background="#e2e8f0",c.style.opacity="1"),p&&(p.textContent="Inactivo",p.style.color="#94a3b8"),a=!1;else{n("PNL Push: Intentando solicitar permiso con requestPermission()...");const l=await window.pushManager.requestPermission();if(n("PNL Push: Resultado devuelto por requestPermission(): "+l),l){n("PNL Push: Permiso concedido por el usuario, suscribiendo...");const f=await window.pushManager.subscribe();n("PNL Push: Resultado final de la suscripción (token sw): "+(f?"Éxito":"Fallo o Null")),f?(m&&(m.style.transform="translateX(19px)"),c&&(c.style.background="#22c55e",c.style.opacity="1"),p&&(p.textContent="Activado",p.style.color="#22c55e"),a=!0):(n("PNL Push: ERROR - Falló la suscripción silente (posible problema de VAPID o Endpoint bloqueado)."),c&&(c.style.opacity="1"))}else n("PNL Push: El usuario denegó o cerró el prompt nativo."),c&&(c.style.opacity="1"),p&&(p.textContent="Permiso denegado o omitido",p.style.color="#ef4444")}}catch(l){n("PNL Push: EXCEPCIÓN FATAL. Error: "+l.message),c&&(c.style.opacity="1")}})},0)}window.showNotificationHistory=async()=>{const s=document.getElementById("notif-history-modal");s&&s.remove();const e=document.createElement("div");e.id="notif-history-modal",e.className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",e.innerHTML=`
        <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg md:max-w-xl overflow-hidden transform transition-all duration-300 border border-slate-100/50 flex flex-col max-h-[85vh]">
            <div class="relative bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                <h3 class="text-sm font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">history</span> 
                    Bandeja de Entrada
                </h3>
                <button id="notif-history-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                    <span class="material-symbols-outlined text-xl">close</span>
                </button>
            </div>
            
            <div id="notif-history-content" class="p-0 bg-slate-50 flex-1 overflow-y-auto relative">
                <!-- Loader -->
                <div class="p-8 flex flex-col items-center justify-center text-slate-400">
                    <span class="material-symbols-outlined text-4xl animate-spin mb-3">progress_activity</span>
                    <p class="text-xs font-bold uppercase tracking-widest">Cargando Mensajes...</p>
                </div>
            </div>
        </div>
    `,document.body.appendChild(e),document.getElementById("notif-history-close").addEventListener("click",()=>{e.remove()});const t=document.getElementById("notif-history-content");try{if(!window.supabaseClient)throw new Error("Supabase no inicializado.");let a=[];try{a=JSON.parse(localStorage.getItem("pnl_read_notifs")||"[]")}catch{}const{data:o,error:r}=await window.supabaseClient.rpc("get_my_push_history",{max_records:50});if(r)throw r;if(!o||o.length===0){t.innerHTML=`
                <div class="p-10 flex flex-col items-center justify-center text-center">
                    <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <span class="material-symbols-outlined text-3xl">inbox</span>
                    </div>
                    <h4 class="text-slate-800 font-black text-sm mb-1">Bandeja Vacía</h4>
                    <p class="text-slate-500 text-xs">Aún no hay mensajes o anuncios enviados.</p>
                </div>
            `;return}let i='<div class="divide-y divide-slate-100">';o.forEach(n=>{const c=a.includes(n.id),m=new Date(n.created_at).toLocaleString("es-CL",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}),p=c?"text-slate-600":"text-slate-900",l=c?"bg-white":"bg-blue-50/30",f=c?"":'<span class="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider shrink-0 shadow-sm shadow-blue-500/30">Nueva</span>';i+=`
                <div class="notif-history-item p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer ${l} group" 
                     data-id="${n.id}" data-url="${n.url||""}">
                     
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <h4 class="text-sm font-bold leading-tight ${p} transition-colors group-hover:text-blue-600 flex-1">${n.title}</h4>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                            ${f}
                            <span class="text-[10px] font-medium text-slate-400 whitespace-nowrap">${m}</span>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">${n.body}</p>
                </div>
            `}),i+="</div>",t.innerHTML=i,t.querySelectorAll(".notif-history-item").forEach(n=>{n.addEventListener("click",c=>{const m=n.getAttribute("data-id"),p=n.getAttribute("data-url"),l=o.find(y=>y.id===m);if(!l)return;if(!a.includes(m)){a.push(m),localStorage.setItem("pnl_read_notifs",JSON.stringify(a));const y=n.querySelector(".bg-blue-500");y&&y.remove(),n.classList.remove("bg-blue-50/30"),n.classList.add("bg-white");const v=n.querySelector("h4");v&&(v.classList.remove("text-slate-900"),v.classList.add("text-slate-600"))}const f=document.getElementById("notif-read-modal");f&&f.remove();const w=document.createElement("div");w.id="notif-read-modal",w.className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300";const g=p&&p!=="undefined"&&p!=="null"&&p!==""?`<a href="${p}" class="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-blue-500/30"><span class="material-symbols-outlined text-base">link</span> Ir al Enlace Adjunto</a>`:"",b=new Date(l.created_at).toLocaleString("es-CL",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});w.innerHTML=`
                    <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden transform transition-all duration-300 border border-slate-100/50 flex flex-col animation-scale-up">
                        <div class="relative bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
                            <h3 class="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                                <span class="material-symbols-outlined text-lg">mail</span> 
                                Mensaje
                            </h3>
                            <button id="notif-read-close" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
                                <span class="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        
                        <div class="p-6 md:p-8 bg-white flex-1 overflow-y-auto">
                            <p class="text-[10px] font-medium text-slate-400 mb-2 uppercase tracking-wide">${b}</p>
                            <h2 class="text-xl font-black text-slate-900 leading-tight mb-4">${l.title}</h2>
                            <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">${l.body}</p>
                            ${g}
                        </div>
                    </div>
                `,document.body.appendChild(w),document.getElementById("notif-read-close").addEventListener("click",()=>{w.remove(),window.updateUnreadCount&&window.updateUnreadCount()})})})}catch(a){console.error("Error cargando historial de notificaciones:",a),t.innerHTML=`
                        < div class="p-8 text-center text-red-500 flex flex-col items-center" >
                <span class="material-symbols-outlined text-4xl mb-2 text-red-300">error</span>
                <p class="text-xs font-bold uppercase">Error cargando el historial.</p>
                <p class="text-[10px] text-red-400 mt-1">${a.message||"Intente nuevamente más tarde."}</p>
            </div >
                    `}};async function T(){try{window.isSupabaseInit&&window.supabaseClient&&await window.supabaseClient.auth.signOut()}catch(s){console.warn("Error durante signOut de Supabase:",s)}localStorage.clear(),sessionStorage.clear(),window.location.href="index.html"}function j(s){if(!s)return!1;let e=s.replace(/\./g,"").replace(/-/g,"");if(e.length<8)return!1;let t=e.slice(0,-1),a=e.slice(-1).toUpperCase(),o=0,r=2;for(let u=1;u<=t.length;u++)o=o+r*e.charAt(t.length-u),r<7?r=r+1:r=2;let i=11-o%11;return i=i===11?"0":i===10?"K":i.toString(),a===i}function I(s){const{title:e,content:t,image_url:a,cta_text:o,cta_url:r,id:i}=s;if(document.getElementById("impact-modal-overlay"))return;const u=document.createElement("div");u.id="impact-modal-overlay",u.className="fixed inset-0 bg-black/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4 opacity-0 transition-opacity duration-500 text-left";const n=document.createElement("div");n.className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative translate-y-20 transition-transform duration-500 border border-white/20";const c='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',m='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',p=a?`
        <div class="h-64 sm:h-80 w-full relative overflow-hidden bg-slate-100 flex items-center justify-center">
            <img src="${a}" 
                 id="impact-modal-img"
                 class="w-full h-full object-cover transition-opacity duration-700 opacity-0" 
                 onload="this.classList.remove('opacity-0'); console.log('PNL Image: Imagen cargada con éxito')"
                 onerror="handleModalImageError(this, '${a}')">
            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
            <!-- Spinner / Loader -->
            <div id="img-loader" class="absolute inset-0 flex items-center justify-center bg-slate-50">
                 <div class="w-8 h-8 border-4 border-[#fba931] border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>`:'<div class="h-10 bg-[#0f172a]"></div>';if(n.innerHTML=`
        ${p}
        
        <button onclick="closeImpactModal('${i}', false)" 
                title="Cerrar por ahora"
                class="absolute top-6 right-6 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10">
            ${c}
        </button>

        <div class="p-8 sm:p-10 text-center">
            <h2 class="serif text-3xl sm:text-4xl text-[#0f172a] mb-6 leading-tight">${e}</h2>
            <div class="text-xs sm:text-sm text-gray-500 mb-8 leading-relaxed font-medium max-h-48 overflow-y-auto custom-scrollbar">
                ${t.replace(/\\n/g,"<br>").replace(/\n/g,"<br>")}
            </div>
            
            <div class="flex flex-col gap-6 items-center">
                ${r?`
                <div class="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <a href="${r}" target="_blank"
                       class="px-8 py-4 bg-[#fba931] text-[#0f172a] rounded-2xl font-900 text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-3 min-w-[140px]">
                        ${o||"Entrar al Enlace"} ${m}
                    </a>
                </div>`:""}

                ${s.contact_email||s.contact_whatsapp?`
                <div class="flex flex-wrap items-center justify-center gap-4 border-t border-gray-100 pt-6 w-full mt-2">
                    ${s.contact_email?`
                    <div class="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-left cursor-pointer hover:bg-slate-100 transition-colors active:scale-95" 
                         onclick="navigator.clipboard.writeText('${s.contact_email}'); const s = this.querySelector('.email-val'); const o = '${s.contact_email}'; s.innerText='¡Copiado al portapapeles!'; setTimeout(() => s.innerText=o, 2000);"
                         title="Clic para copiar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-gray-400 shrink-0" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <div>
                            <span class="block text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Copiar Correo</span>
                            <span class="email-val text-[11px] font-bold text-[#fba931]">${s.contact_email}</span>
                        </div>
                    </div>`:""}

                    ${s.contact_whatsapp?`
                    <a href="https://wa.me/${s.contact_whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent("Hola, me comunico por este anuncio: "+e)}" target="_blank"
                       class="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-6 py-3 rounded-xl transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.4 8.38 8.38 0 0 1 3.9 1.1L21 4z"></path></svg>
                        <span class="text-[10px] font-black uppercase tracking-widest">Enviar WhatsApp</span>
                    </a>`:""}
                </div>`:""}
                
                <button onclick="closeImpactModal('${i}', true)" 
                        class="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors">
                    No volver a ver este anuncio
                </button>
            </div>
        </div>
    `,u.appendChild(n),document.body.appendChild(u),setTimeout(()=>{u.classList.remove("opacity-0"),n.classList.remove("translate-y-20"),n.classList.add("translate-y-0")},100),a){const l=document.getElementById("impact-modal-img"),f=document.getElementById("img-loader");l&&(l.complete?(f?.remove(),l.classList.remove("opacity-0")):l.onload=()=>{f?.remove(),l.classList.remove("opacity-0"),console.log("PNL Image: Imagen cargada (evento)")})}}function $(s,e){console.error("PNL Image Error: No se pudo cargar la imagen",e);const t=s.parentElement;document.getElementById("img-loader")?.remove(),t.innerHTML=`
        <div class="w-full h-full bg-[#0f172a] flex items-center justify-center overflow-hidden">
            <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <span class="serif text-4xl text-white opacity-20 italic">PNL Biobío</span>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
        </div>
    `}function A(s,e=!1){const t=document.getElementById("impact-modal-overlay"),a=t?.querySelector("div");if(t&&a){if(a.classList.add("translate-y-20"),t.classList.add("opacity-0"),s)if(e){const o=JSON.parse(localStorage.getItem("pnl_viewed_announcements")||"[]");o.includes(s)||(o.push(s),localStorage.setItem("pnl_viewed_announcements",JSON.stringify(o))),console.log("PNL Biobío: Anuncio descartado permanentemente.")}else{const o=JSON.parse(sessionStorage.getItem("pnl_session_dismissed")||"[]");o.includes(s)||(o.push(s),sessionStorage.setItem("pnl_session_dismissed",JSON.stringify(o))),console.log("PNL Biobío: Anuncio cerrado por ahora (sesión).")}setTimeout(()=>t.remove(),500)}}async function k(){let s=0;for(;!window.isSupabaseInit&&s<20;)await new Promise(e=>setTimeout(e,500)),s++;if(!window.isSupabaseInit||!window.supabaseClient){console.warn("Anuncios: Supabase no se inicializó a tiempo.");return}try{console.log("PNL Biobío: Buscando anuncios activos...");const{data:e,error:t}=await window.supabaseClient.from("regional_announcements").select("*").eq("is_active",!0).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(t)throw t;if(!e){console.log("PNL Biobío: No hay anuncios activos ahora mismo.");return}console.log("PNL Biobío: Anuncio encontrado:",e.title);const a=window.location.search.includes("test=1");if(JSON.parse(localStorage.getItem("pnl_viewed_announcements")||"[]").includes(e.id)&&!a){console.log("PNL Biobío: El usuario ya vio este anuncio (Permanente). No se muestra.");return}if(JSON.parse(sessionStorage.getItem("pnl_session_dismissed")||"[]").includes(e.id)&&!a){console.log("PNL Biobío: El anuncio fue cerrado en esta sesión. No se muestra.");return}if(e.expires_at&&new Date(e.expires_at)<new Date){console.log("PNL Biobío: El anuncio ha expirado.");return}if(e.target_audience==="militants"){const{data:{user:l}}=await window.supabaseClient.auth.getUser();if(!l){console.log("PNL Biobío: Anuncio restringido a militantes (no logueado).");return}}const i=window.location.pathname.split("/").pop()||"index.html";if(["index.html","nosotros.html","contacto.html","publicaciones-oficiales.html","forja-login.html",""].includes(i)&&e.target_audience!=="all"){console.log("PNL Biobío: Anuncio omitido en página pública/login (solo aplica dentro de la Forja).");return}const m=i.startsWith("forja-")&&i!=="forja-login.html"?5e3:1500,p={...e};console.log(`PNL Biobío: Disparando modal de impacto en ${m}ms...`),setTimeout(()=>I(p),m)}catch(e){console.warn("Error al comprobar anuncios:",e)}}const H="BG5gsJgsZ0t3Tu1GfWFYuHtDNAlkJXrMq0m_-3vPobewZaTzdqoHC8jC0elHKSyyhZ9_1Ov4VZacPUgwxEXcLuw";class U{constructor(){const e="serviceWorker"in navigator,t="PushManager"in window,a="Notification"in window,o=window.isSecureContext;this.isSupported=e&&t,console.log("PNL Push Manager: Iniciando clase..."),console.log(`PNL Push Manager: isSecureContext = ${o}`),console.log(`PNL Push Manager: serviceWorker = ${e}`),console.log(`PNL Push Manager: PushManager = ${t}`),console.log(`PNL Push Manager: Notification = ${a}`),console.log(`PNL Push Manager: isSupported Final = ${this.isSupported}`)}checkSupport(){return this.isSupported}getPermissionStatus(){return Notification.permission}isIOS(){const e=navigator.userAgent;return/iPhone|iPad|iPod/i.test(e)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1}isStandalone(){return window.navigator.standalone===!0||window.matchMedia("(display-mode: standalone)").matches}async requestPermission(){if(console.log("PNL Push Manager: requestPermission() invocado. checkSupport() =",this.checkSupport()),!this.checkSupport())return console.warn("PNL Push Manager: El navegador no soporta ServiceWorkers o PushManager."),!1;if(console.log("PNL Push Manager: Permiso actual:",Notification.permission),Notification.permission==="granted")return!0;try{console.log("PNL Push Manager: Solicitando permiso al navegador...");const e=await new Promise(t=>{const a=Notification.requestPermission(o=>{t(o)});a&&a.then(t)});return console.log("PNL Push Manager: Respuesta del usuario al prompt:",e),e==="granted"}catch(e){return console.error("PNL Push Manager: Error pidiendo permiso:",e),!1}}urlBase64ToUint8Array(e){const t="=".repeat((4-e.length%4)%4),a=(e+t).replace(/-/g,"+").replace(/_/g,"/"),o=window.atob(a),r=new Uint8Array(o.length);for(let i=0;i<o.length;++i)r[i]=o.charCodeAt(i);return r}async subscribe(){const e=a=>{console.log(a),window.pnlLog&&window.pnlLog(a)},t=(a,o)=>{console.error(a,o),window.pnlLog&&window.pnlLog("ERROR FATAL: "+a+" "+(o?.message||o))};if(!this.checkSupport())return null;e("PNL Push Manager: Iniciando subscribe() interno...");try{e("PNL Push Manager: Asegurando registro explícito de /sw.js..."),await navigator.serviceWorker.register("/sw.js"),e("PNL Push Manager: Esperando a navigator.serviceWorker.ready...");const a=await navigator.serviceWorker.ready;e("PNL Push Manager: registration listo. Revisando suscripciones existentes...");let o=await a.pushManager.getSubscription();if(e("PNL Push Manager: Resultado de getSubscription() -> "+!!o),!o){e("PNL Push Manager: No hay suscripción previa. Generando nueva con PushManager...");try{const r=this.urlBase64ToUint8Array(H);e("PNL Push Manager: Llave VAPID convertida exitosamente."),o=await a.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:r}),e("PNL Push Manager: ✅ Suscripción creada con éxito.")}catch(r){throw t("PNL Push Manager: ❌ Fallo fatal dentro de registration.pushManager.subscribe()",r),r}}return e("PNL Push Manager: Guardando token de suscripción en la base de datos..."),await this.saveSubscriptionToDB(o),e("PNL Push Manager: Token guardado exitosamente."),localStorage.setItem("pnl_push_subscribed","true"),e("PNL Push Manager: Proceso de suscripción finalizado por completo."),o}catch(a){return t("❌ Error general al suscribir a push",a),null}}async saveSubscriptionToDB(e){if(!(!window.supabaseClient||!window.isSupabaseInit))try{const{data:{user:t}}=await window.supabaseClient.auth.getUser();if(!t)return;const a=e.toJSON(),{error:o}=await window.supabaseClient.from("push_subscriptions").upsert({user_id:t.id,endpoint:a.endpoint,keys_p256dh:a.keys.p256dh,keys_auth:a.keys.auth,user_agent:navigator.userAgent,is_active:!0,last_used_at:new Date().toISOString()},{onConflict:"endpoint"});if(o)throw o}catch(t){console.error("Error guardando en suscripciones:",t)}}async isSubscribed(){if(!this.checkSupport())return!1;try{await navigator.serviceWorker.register("/sw.js");const a=!!await(await navigator.serviceWorker.ready).pushManager.getSubscription();return a?localStorage.setItem("pnl_push_subscribed","true"):localStorage.removeItem("pnl_push_subscribed"),a}catch{return localStorage.getItem("pnl_push_subscribed")==="true"}}async unsubscribe(){if(!this.checkSupport())return!1;try{await navigator.serviceWorker.register("/sw.js");const t=await(await navigator.serviceWorker.ready).pushManager.getSubscription();return t&&(await t.unsubscribe(),window.supabaseClient&&window.isSupabaseInit&&await window.supabaseClient.from("push_subscriptions").update({is_active:!1}).eq("endpoint",t.endpoint)),localStorage.removeItem("pnl_push_subscribed"),!0}catch(e){return console.error("Error al desuscribir:",e),!1}}async getUnreadCount(){try{if(!window.supabaseClient||!window.isSupabaseInit)return 0;const e=localStorage.getItem("pnl_last_notif_seen")||"1970-01-01T00:00:00Z",{count:t,error:a}=await window.supabaseClient.from("push_notifications_log").select("*",{count:"exact",head:!0}).gt("created_at",e);return a?0:t??0}catch{return 0}}markAllAsRead(){localStorage.setItem("pnl_last_notif_seen",new Date().toISOString())}}function O(){if(sessionStorage.getItem("ios-prompt-closed")==="true")return;const s=document.createElement("div");if(s.id="ios-install-prompt",s.className="fixed bottom-4 left-4 right-4 z-[9999] bg-[#0f172a] text-white p-6 rounded-3xl shadow-2xl border border-gray-800 animate-slide-up md:max-w-md md:left-auto md:right-8",s.innerHTML=`
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
    `,document.body.appendChild(s),document.getElementById("close-ios-prompt").onclick=()=>{s.classList.add("animate-fade-out"),setTimeout(()=>{s.remove(),sessionStorage.setItem("ios-prompt-closed","true")},300)},!document.getElementById("push-animations")){const e=document.createElement("style");e.id="push-animations",e.textContent=`
            @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
            .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
            .animate-fade-out { animation: fade-out 0.3s forwards; }
        `,document.head.appendChild(e)}}window.showToast=N;window.toggleUserMenu=_;window.setButtonLoading=M;window.logout=T;window.initNavbar=P;window.validateRUT=j;window.showImpactModal=I;window.handleModalImageError=$;window.closeImpactModal=A;window.checkAndShowAnnouncements=k;const x=new U;window.pushManager=x;window.openVideoModal=function(s){if(!s)return;function e(i){const u=/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,n=i.match(u);return n&&n[2].length===11?n[2]:null}const t=e(s);if(!t){window.open(s,"_blank");return}const a="global-yt-modal";let o=document.getElementById(a);o&&o.remove(),o=document.createElement("div"),o.id=a,o.className="fixed inset-0 z-[200000] flex items-center justify-center p-4 sm:p-10 bg-slate-900/95 backdrop-blur-md opacity-0 transition-opacity duration-300",o.innerHTML=`
        <div class="relative w-full max-w-5xl bg-black rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden transform scale-95 transition-transform duration-300 flex flex-col" style="aspect-ratio: 16/9; max-height: 90vh;">
            <button id="close-yt-modal" class="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all focus:outline-none" title="Cerrar Video">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
            <iframe class="w-full h-full border-0" 
                src="https://www.youtube.com/embed/${t}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&playsinline=1" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen>
            </iframe>
        </div>
    `,document.body.appendChild(o),document.body.style.overflow="hidden",requestAnimationFrame(()=>{o.classList.remove("opacity-0"),o.firstElementChild.classList.remove("scale-95"),o.firstElementChild.classList.add("scale-100")});const r=()=>{o.classList.add("opacity-0"),o.firstElementChild.classList.remove("scale-100"),o.firstElementChild.classList.add("scale-95"),setTimeout(()=>{o.remove(),document.body.style.overflow=""},300)};document.getElementById("close-yt-modal").addEventListener("click",r),o.addEventListener("click",i=>{i.target===o&&r()})};async function E(){if(!x.checkSupport())return;let s=0;for(;!window.isSupabaseInit&&s<10;)await new Promise(t=>setTimeout(t,500)),s++;const{data:{user:e}}=await window.supabaseClient.auth.getUser();e&&(x.isIOS()?x.isStandalone()?!await x.isSubscribed()&&x.getPermissionStatus()==="granted"&&await x.subscribe():O():x.getPermissionStatus()==="granted"&&(await x.isSubscribed()||await x.subscribe()))}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",()=>{P(),k(),E()}):(P(),k(),E());

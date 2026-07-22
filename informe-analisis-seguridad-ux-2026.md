# Informe de Análisis: Seguridad, UX/UI y Estrategia de Engagement
### Plataforma Web PNL Biobío — Partido Nacional Libertario, Región del Biobío

**Fecha:** 22 de julio de 2026
**Alcance:** Sitio público, Portal de Militantes ("Forja"), Panel de Administración, funciones serverless (Netlify + Supabase Edge), configuración de base de datos y PWA.
**Metodología:** Revisión estática de código, análisis de flujos de autenticación/autorización, evaluación heurística de usabilidad (Nielsen) y accesibilidad (WCAG 2.1), y análisis de retención basado en el modelo Hook (gancho-acción-recompensa).

> **Nota de contexto:** El proyecto ya cuenta con un trabajo de seguridad previo notable (`pending-fixes.md`, verificación de JWT en todas las funciones, sanitización con DOMPurify + sanitize-html, RLS reforzado en el foro, CSP y cabeceras de seguridad). Este informe reconoce esa base sólida y se enfoca en cerrar las brechas que quedan y en elevar la experiencia y el atractivo de la plataforma.

---

## 1. Resumen Ejecutivo

La plataforma tiene una **arquitectura backend sólida**: las funciones serverless verifican el JWT criptográficamente, validan roles del lado del servidor con `service_role`, sanitizan HTML y moderan contenido con IA. El foro tiene RLS bien pensado (los INSERT solo pasan por la función con moderación).

Sin embargo, quedan **riesgos importantes en la capa de autorización del cliente y en la protección de datos personales (PII)**, agravados porque la plataforma maneja información sensible (RUT, fecha de nacimiento, teléfono, comuna) sujeta a la **Ley 21.719 de Protección de Datos Personales de Chile**.

En **UX/UI**, la plataforma sufre de **inconsistencia entre dos sistemas de diseño**, problemas de **accesibilidad** (zoom deshabilitado, tipografías diminutas, bajo contraste), mensajes de error técnicos expuestos al usuario y un login "fantasma" en la portada que confunde.

En **engagement**, la plataforma tiene ingredientes valiosos (cursos, quizzes, foros, notificaciones push) pero la cara pública es estática y no da razones para volver.

### Cuadro de hallazgos por severidad

| Severidad | Seguridad | UX/UI | Total |
|-----------|-----------|-------|-------|
| 🔴 Crítico | 2 | 0 | 2 |
| 🟠 Alto | 5 | 3 | 8 |
| 🟡 Medio | 6 | 5 | 11 |
| 🔵 Bajo | 3 | 4 | 7 |

---

## 2. Hallazgos de Seguridad

### 🔴 S-01 — CRÍTICO: Autorización de administración basada solo en el cliente

**Ubicación:** `admin-dashboard.html:294` y todas las páginas `admin-*.html`.

```js
const role = localStorage.getItem('pnl_user_role');
if (!session || !['super_admin', ...].includes(role)) {
    window.location.href = 'forja-login.html';
}
```

**Problema:** El "guardián" que decide si alguien puede ver el panel de administración lee el rol desde `localStorage`, un valor que **cualquier usuario puede modificar** desde la consola del navegador:

```js
localStorage.setItem('pnl_user_role', 'super_admin'); // y recarga
```

Con esto, un militante común entra a las pantallas de administración. La única barrera **real** pasa a ser el **Row Level Security (RLS)** de la base de datos. Si el RLS de alguna tabla (especialmente `profiles`, `courses`, `ballots`, `email_campaigns`) permite lectura/escritura a cualquier usuario autenticado, hay una **escalada de privilegios efectiva**.

**Solución:**
1. **Nunca** confiar en `localStorage` para autorizar. Al cargar cada página admin, verificar el rol contra la base de datos con el usuario actual:
   ```js
   const { data: { user } } = await supabaseClient.auth.getUser();
   const { data: prof } = await supabaseClient
       .from('profiles').select('role').eq('auth_id', user.id).single();
   if (!ADMIN_ROLES.includes(prof?.role)) { location.href = 'forja-login.html'; return; }
   ```
   (Sigue siendo defensa en profundidad, no la barrera final).
2. **La barrera final debe ser RLS**: cada tabla administrativa debe tener políticas que exijan rol admin mediante una función `SECURITY DEFINER` como `check_is_admin(auth.uid())`. Las lecturas/escrituras sensibles deben canalizarse por funciones serverless con `service_role` (como ya se hace en el foro).
3. Verificar RLS en TODAS las tablas, no solo el foro.

---

### 🔴 S-02 — CRÍTICO: Exposición potencial de datos personales (PII) vía RLS de `profiles`

**Ubicación:** `admin-dashboard.html:374`, `supabase/functions/send-mass-email`, `auth.js:46`.

**Problema:** El código del cliente ejecuta consultas como:
```js
supabaseClient.from('profiles').select('*', { count: 'exact', head: true });
supabaseClient.from('profiles').select('email').range(from, to);
```
La tabla `profiles` contiene **RUT, fecha de nacimiento, teléfono, comuna y email** — datos sensibles bajo la Ley 21.719. **No hay una migración en el repositorio que confirme el RLS de `profiles`.** Si la política permite `SELECT` a cualquier usuario autenticado sobre todas las filas, entonces **cualquier militante puede descargar el padrón completo** con datos personales de todos los demás (riesgo legal, reputacional y de doxxing en un contexto político).

**Solución:**
1. Confirmar y endurecer el RLS de `profiles`:
   - `SELECT`: un usuario solo ve **su propia fila** (`auth_id = auth.uid()`).
   - Vistas agregadas/administrativas (conteos, padrón, envío masivo): **solo** por función serverless con `service_role`, previa verificación de rol admin.
2. Mover `loadDashboardStats()` (conteos de `profiles`, `courses`, `ballots`) a una función serverless o a un RPC `SECURITY DEFINER` que devuelva solo agregados, sin exponer filas.
3. Minimizar datos: evaluar si el RUT completo debe almacenarse o puede tokenizarse/hashearse.

---

### 🟠 S-03 — ALTO: Política de contraseñas débil (mínimo 6 caracteres)

**Ubicación:** `forja-login.html:126,283`, `create-user-temp/index.ts:73`.

**Problema:** El cambio de contraseña exige solo **6 caracteres, sin complejidad**. Las contraseñas temporales generadas (`PNL-` + 8 chars base36) son predecibles en formato. Para un portal con PII y roles administrativos, es insuficiente.

**Solución:**
- Exigir mínimo **10–12 caracteres** con al menos una mayúscula, un número y evitar contraseñas comunes.
- Configurar la política de contraseñas en **Supabase Auth → Policies** (así se aplica en el servidor, no solo en el cliente).
- Añadir un **medidor de fortaleza** visual y advertencia de Bloq Mayús.
- Contraseñas temporales: usar `crypto.getRandomValues` en vez de `Math.random()` (que no es criptográficamente seguro).
- Implementar **MFA/2FA** al menos para roles administrativos.

---

### 🟠 S-04 — ALTO: Función de contacto sin autenticación ni rate-limiting real

**Ubicación:** `supabase/functions/contact-email/index.ts`, `contact-handler.js`.

**Problema:** La función `contact-email` es pública y solo está protegida por un **honeypot** y un **cooldown en `localStorage`**, ambos **triviales de saltar** llamando la función directamente. Esto habilita **email bombing** y **agotamiento de la cuota de Resend** (costo económico y posible bloqueo del dominio de envío).

**Solución:**
- Añadir rate-limiting **del lado del servidor** por IP (p.ej. tabla `contact_rate_limit` en Supabase o el rate-limiting nativo de Netlify).
- Integrar **CAPTCHA invisible** (hCaptcha/Cloudflare Turnstile — sin costo, respeta privacidad).
- Validar formato de email en el servidor y limitar longitud (ya se limita longitud ✓).
- El CORS está fijado solo a `nacionallibertariobiobio.cl` (sin `www` ni Netlify) — corregir para no romper el formulario en esos orígenes.

---

### 🟠 S-05 — ALTO: Mensajes de error crudos y enumeración de usuarios en el login

**Ubicación:** `forja-login.html:199,235`.

**Problema:** Se muestran al usuario errores técnicos de Supabase (`"PGRST116: ..."`, `err.message` completo). Además, distinguir entre "usuario no existe" y "contraseña incorrecta" permite **enumeración de cuentas** (saber qué emails están registrados).

**Solución:**
- Mensajes genéricos al usuario: *"Correo o contraseña incorrectos."* para cualquier fallo de credenciales.
- Registrar el detalle técnico solo en el log del servidor, nunca en la UI.
- No revelar la existencia de la cuenta.

---

### 🟠 S-06 — ALTO: `send-mass-email` inyecta HTML sin sanitizar a todos los militantes

**Ubicación:** `supabase/functions/send-mass-email/index.ts:141`.

**Problema:** El `bodyHtml` del administrador se envía tal cual (`html: bodyHtml`) a todos los correos y se guarda en `email_campaigns.body_html`, que luego se renderiza en `admin-emails.html`. Aunque es una acción de `super_admin`, una cuenta admin comprometida (o un admin malicioso) podría inyectar contenido peligroso, y el HTML almacenado podría producir **XSS almacenado** en el panel al previsualizar campañas.

**Solución:**
- Sanitizar `bodyHtml` en el servidor con una allowlist orientada a email (`sanitize-html`) antes de enviar y guardar.
- Al previsualizar campañas en el panel, renderizar dentro de un `<iframe sandbox>` o sanitizar con DOMPurify.

---

### 🟠 S-07 — ALTO: CSP con `unsafe-inline` y `unsafe-eval` (ya identificado)

**Ubicación:** `netlify.toml:22`.

**Problema:** `script-src ... 'unsafe-inline' 'unsafe-eval'` anula gran parte de la protección de la CSP frente a XSS. Se debe a los `<script>` inline y `onclick=` en los HTML, y a dependencias como Quill.

**Solución (plan por fases, ya esbozado en `pending-fixes.md`):**
1. Migrar scripts inline y handlers `onclick=` a módulos `.js` externos con `addEventListener`.
2. Reemplazar librerías que requieran `eval`.
3. Adoptar **CSP basada en nonce** por deploy (Netlify Edge Function).
4. Meta: `script-src 'self' 'nonce-XXX'`.

---

### 🟡 S-08 — MEDIO: Scripts de CDN sin Subresource Integrity (SRI)

**Ubicación:** `index.html:543`, `forja-login.html:143`, etc.

**Problema:** `<script src="https://cdn.jsdelivr.net/...supabase-js@2">` sin `integrity`. Si el CDN es comprometido, se ejecuta código arbitrario con acceso a las sesiones.

**Solución:** Añadir `integrity="sha384-..."` y `crossorigin="anonymous"`, o mejor aún, **auto-hospedar** las librerías críticas (ya se usa Vite; se pueden empaquetar como dependencias). Fijar versiones exactas (`@2.98.0`, no `@2`).

---

### 🟡 S-09 — MEDIO: Rate-limit en memoria no compartido entre instancias

**Ubicación:** `netlify/edge-functions/rate-limit.js`.

**Problema:** El `Map` en memoria no persiste entre instancias edge ni entre regiones, por lo que el límite real es mucho más laxo de lo esperado.

**Solución:** Usar el **rate-limiting nativo de Netlify** o un store distribuido (Upstash/Redis). Mantener la edge function como complemento.

---

### 🟡 S-10 — MEDIO: Tokens de sesión en `localStorage` (default de Supabase)

**Problema:** Supabase guarda el JWT en `localStorage`, accesible por JavaScript → un XSS exfiltra la sesión. La mitigación actual es DOMPurify + CSP, pero la CSP está debilitada (S-07).

**Solución:** Mantener sanitización estricta, cerrar S-07, y evaluar el flujo de cookies `httpOnly` con SSR de Supabase si se migra a un framework. Mantener el auto-logout por inactividad (ya implementado ✓, 45 min).

---

### 🟡 S-11 — MEDIO: Bypass del cambio de contraseña obligatorio

**Ubicación:** `forja-login.html:203`.

**Problema:** `must_change_password` se verifica en el cliente. Un usuario técnico podría autenticarse con `signInWithPassword` (que ya devuelve una sesión válida) y navegar directamente a otra página, saltando el modal.

**Solución:** Forzar el cambio en el servidor: RLS/trigger que bloquee operaciones mientras `must_change_password = true`, o revocar la sesión hasta completar el cambio.

---

### 🟡 S-12 — MEDIO: `Math.random()` para contraseñas temporales

**Ubicación:** `create-user-temp/index.ts:73`. Ver solución en S-03.

### 🔵 S-13/14/15 — BAJO
- **`get-user-by-email`** en `create-user-temp` puede filtrar existencia de cuentas por email (enumeración). Devolver respuestas uniformes.
- **Logs con `user_agent` y `page_url`** completos (`logger.js`) — revisar retención y minimización (Ley 21.719).
- **Versiones de dependencias con rango `^`** — fijar versiones y activar Dependabot/escaneo de vulnerabilidades.

---

## 3. Hallazgos de UX / UI y Accesibilidad

### 🟠 U-01 — ALTO: Dos sistemas de diseño incoherentes

**Problema:** La portada (`index.html`) usa CSS propio, fuente **Roboto** y una paleta `#182d56`; el portal Forja usa **Tailwind** + **Montserrat** y `#0f172a`. Los botones, radios de borde, sombras y tipografías no coinciden. Esto rompe la percepción de una marca única y profesional.

**Solución:** Unificar en **un solo design system** (recomendado: Tailwind en todo). Definir tokens de marca (colores, tipografía, espaciados, radios) y una librería de componentes reutilizables (botón, tarjeta, input, modal). La navbar/footer ya son web components (`navbar.js`, `footer.js`) — extender ese patrón.

---

### 🟠 U-02 — ALTO: Zoom deshabilitado (barrera de accesibilidad)

**Ubicación:** `index.html:7` — `maximum-scale=1.0, user-scalable=0`.

**Problema:** Impedir el zoom **viola WCAG 2.1 (1.4.4)** y perjudica a personas con baja visión y a adultos mayores (segmento relevante en un partido).

**Solución:** Usar `content="width=device-width, initial-scale=1.0"` y permitir el zoom.

---

### 🟠 U-03 — ALTO: Login "fantasma" y enlace roto en la portada

**Ubicación:** `index.html:525-565`.

**Problema:** La portada tiene un modal de login que **no funciona** (`alert('Sede regional en modo de pruebas...')`), mientras que los botones "Foros/Votaciones/Forja" sí llevan al login real (`forja-login.html`). Coexisten dos accesos y uno es falso → confunde y da sensación de sitio inacabado. Además, el enlace "Contacta a soporte nacional" apunta a una ruta relativa rota (`../pnl-nacional/...`).

**Solución:** Eliminar el modal fantasma. Un único camino de acceso claro. Corregir/eliminar el enlace roto y apuntar a `contacto.html`.

---

### 🟡 U-04 — MEDIO: Tipografías diminutas y bajo contraste

**Problema:** Uso extendido de `text-[9px]`/`text-[10px]` en mayúsculas y `text-gray-400` sobre blanco (contraste insuficiente, < 4.5:1). Difícil de leer, especialmente en móvil y para adultos mayores.

**Solución:** Tamaño mínimo **12–14px** para texto funcional; asegurar contraste **AA (4.5:1)**; reservar mayúsculas para etiquetas cortas. Auditar con Lighthouse/axe.

---

### 🟡 U-05 — MEDIO: `<title>` duplicado y metadatos inconsistentes

**Ubicación:** `index.html:8 y 14` (dos `<title>`), dominios mezclados (`pnl-biobio.cl`, `nacionallibertariobiobio.cl`, `pnlbiobio.cl`).

**Solución:** Un solo `<title>`. Definir **un dominio canónico** y usarlo de forma consistente en `canonical`, Open Graph y sitemap. Añadir `sitemap.xml` y `robots.txt`.

---

### 🟡 U-06 — MEDIO: Mensajes de error técnicos hacia el usuario

Ver S-05. Desde UX: sustituir `"PGRST116..."` por mensajes humanos y accionables con sugerencia de siguiente paso.

### 🟡 U-07 — MEDIO: Rendimiento de carga

**Problema:** Múltiples solicitudes a Google Fonts (render-blocking), fuente `Sentient-Regular` referenciada pero no cargada (cae a serif genérico), imágenes PNG grandes sin `loading="lazy"` ni formato moderno.

**Solución:** Auto-hospedar fuentes con `font-display: swap`; convertir imágenes a **WebP/AVIF**; `loading="lazy"` en imágenes below-the-fold; purgar CSS no usado con Tailwind.

### 🟡 U-08 — MEDIO: Formularios y accesibilidad semántica

**Problema:** Botones solo-ícono sin `aria-label`, algunos inputs sin `<label for>` asociado, foco no siempre visible, contacto extrae campos por `nth-of-type` (frágil).

**Solución:** `aria-label` en botones-ícono; asociar labels; estados de foco visibles; nombrar inputs con `name`/`id` y leerlos por selector estable.

### 🔵 U-09 a U-12 — BAJO
- Falta estado de **carga (skeletons)** uniforme y estados vacíos amables (algunos ya existen ✓).
- Falta **modo oscuro** (la marca es oscura; sería natural).
- Falta **breadcrumbs**/orientación en el área admin.
- El **wizard de onboarding** existe (`wizard.js`) pero está **deshabilitado** — reactivarlo mejoraría la primera experiencia.

---

## 4. Plan de Mejoras (Roadmap priorizado)

### Fase 0 — Contención inmediata (1–3 días)
| # | Acción | Ref |
|---|--------|-----|
| 1 | **Verificar y endurecer RLS de `profiles` y todas las tablas admin** en Supabase | S-01, S-02 |
| 2 | Reemplazar chequeo de rol por consulta a `profiles` (no `localStorage`) en páginas admin | S-01 |
| 3 | Mover conteos del dashboard a RPC `SECURITY DEFINER`/función serverless | S-02 |
| 4 | Mensajes de error genéricos en login (sin fugas técnicas) | S-05, U-06 |
| 5 | Rehabilitar zoom (`user-scalable`), corregir `<title>` duplicado y login fantasma | U-02, U-03, U-05 |

### Fase 1 — Endurecimiento (1–2 semanas)
| # | Acción | Ref |
|---|--------|-----|
| 6 | Política de contraseñas fuerte + `crypto.getRandomValues` + medidor de fortaleza | S-03 |
| 7 | Rate-limiting server-side + CAPTCHA (Turnstile) en contacto | S-04 |
| 8 | Sanitizar `bodyHtml` en emails masivos y en previsualización | S-06 |
| 9 | SRI o auto-hospedaje de librerías CDN; fijar versiones exactas | S-08 |
| 10 | MFA/2FA para roles administrativos | S-03 |
| 11 | Unificar design system (tokens + componentes) | U-01 |

### Fase 2 — Calidad y cumplimiento (3–4 semanas)
| # | Acción | Ref |
|---|--------|-----|
| 12 | Plan de eliminación de `unsafe-inline`/`unsafe-eval` (CSP con nonce) | S-07 |
| 13 | Auditoría de accesibilidad WCAG AA (contraste, tamaños, ARIA, foco) | U-04, U-08 |
| 14 | Optimización de rendimiento (WebP, lazy-load, fuentes locales, purga CSS) | U-07 |
| 15 | Revisión de cumplimiento Ley 21.719 (minimización, retención de logs, consentimiento) | S-02, S-14 |
| 16 | Rate-limit distribuido (Netlify nativo/Upstash) | S-09 |

### Fase 3 — Madurez continua
- Escaneo automático de dependencias (Dependabot) y secretos.
- Tests E2E de flujos de auth y autorización.
- Monitoreo/alertas de errores (Sentry) y de intentos de acceso anómalos.

---

## 5. Estrategia para hacer la plataforma más atractiva y aumentar la retención

> Objetivo: que los usuarios **entren más seguido, se queden más tiempo y vuelvan**. Se aplica el modelo **Gancho → Acción → Recompensa → Inversión** y buenas prácticas de comunidades y formación online.

### 5.1 Dar vida a la cara pública (captación)
La portada hoy es estática (bienvenida + directiva + botones). Razones para volver:
- **Feed de actividad regional**: noticias, comunicados y fotos de actividades, actualizado con frecuencia. Es el mayor motor de "volver a mirar".
- **Calendario público de eventos** con opción "Agregar a mi calendario" y recordatorio.
- **Contador de comunidad** ("Somos X militantes en el Biobío") y mapa/insignias por comuna — prueba social.
- **Testimonios** de militantes y casos de formación completada.
- **Historia y propósito** con narrativa visual (misión Vida-Libertad-Propiedad) en vez de solo texto.

### 5.2 Gamificar la Forja (formación) — retención del militante
Ya existen cursos y quizzes; convertirlos en un **camino con progreso visible**:
- **Barra de progreso y niveles** ("Aprendiz → Forjador → Líder"), con la malla curricular (`mockup-malla.html`) como mapa visual.
- **Insignias/logros** al completar cursos, aprobar quizzes o participar en el foro.
- **Rachas** ("llevas 5 días activo") y micro-recompensas por constancia.
- **Certificados descargables** al completar un módulo (compartibles en redes → captación).
- **Ranking/tabla de líderes** opcional por comuna (con opt-in por privacidad).

### 5.3 Comunidad viva (foros y votaciones)
- **Notificaciones push** (ya implementadas ✓) para: nueva respuesta a tu tema, nuevo evento, nueva votación abierta, resultados publicados. Es el gancho externo más potente para reactivar visitas.
- **Resumen semanal por email** ("Lo más comentado esta semana", "Cursos nuevos", "Vota antes del viernes").
- **Menciones y reacciones** en el foro; destacar "temas populares".
- **Votaciones locales** con resultados en vivo y visualización clara → sensación de que participar importa.

### 5.4 Onboarding y hábitos
- **Reactivar el wizard** (`wizard.js`, hoy deshabilitado) para guiar la primera sesión: completar perfil, activar notificaciones, hacer el primer curso.
- **Checklist de primeros pasos** con progreso ("Perfil 100% completo").
- **PWA instalable** (ya soportada ✓): promover "Instala la app" para tener el ícono en el teléfono → visitas recurrentes. Mejorar el prompt de instalación (ya existe para iOS).

### 5.5 Personalización y valor percibido
- **Dashboard del militante** al entrar: "tus próximos eventos", "tu progreso", "votaciones pendientes", "mensajes nuevos".
- **Contenido segmentado por comuna** (ya hay campo `comuna`): eventos y noticias de su territorio primero.
- **Modo oscuro** acorde a la identidad de marca.

### 5.6 Métricas para medir el éxito
Definir e instrumentar (respetando privacidad): usuarios activos semanales (WAU), tasa de retorno a 7/30 días, cursos completados, participación en foros/votaciones, instalaciones PWA, opt-in de notificaciones. Iterar según datos.

### Priorización de engagement (impacto/esfuerzo)
| Prioridad | Iniciativa | Esfuerzo |
|-----------|-----------|----------|
| ⭐ Alta | Feed de actividad + calendario público | Medio |
| ⭐ Alta | Notificaciones push para eventos/foros/votaciones | Bajo (ya existe base) |
| ⭐ Alta | Barra de progreso + insignias en Forja | Medio |
| Media | Resumen semanal por email | Bajo |
| Media | Reactivar wizard + checklist de onboarding | Bajo |
| Media | Dashboard personalizado del militante | Medio |
| Baja | Ranking por comuna, modo oscuro, certificados | Medio |

---

## 6. Conclusión

La plataforma parte de una **base técnica seria** en el backend. Las prioridades para elevarla a un estándar profesional y seguro son, en orden:

1. **Cerrar la brecha de autorización**: RLS estricto en `profiles` y tablas admin, y dejar de confiar en `localStorage` (S-01, S-02). Es lo más urgente por el riesgo de fuga de datos personales y escalada de privilegios.
2. **Endurecer credenciales y superficie pública**: contraseñas fuertes + MFA, rate-limit/CAPTCHA en contacto, sanitización de emails (S-03, S-04, S-06).
3. **Unificar y hacer accesible la experiencia**: un solo design system, accesibilidad WCAG AA, eliminar el login fantasma (U-01, U-02, U-03).
4. **Activar la retención**: feed público, gamificación de la Forja y notificaciones para eventos/votaciones, que son las palancas de mayor impacto para que los usuarios vuelvan.

Ejecutando la Fase 0 y Fase 1, la plataforma pasa de "buena base con riesgos" a "segura y confiable"; sumando la estrategia de engagement, se convierte además en un espacio que los militantes **quieren** visitar.

---
*Informe generado como análisis técnico interno. Los ítems marcados requieren validación en los paneles de Supabase y Netlify, a los que este análisis no tiene acceso directo.*

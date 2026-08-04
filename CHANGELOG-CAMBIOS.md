# 📝 CHANGELOG — Cambios de Seguridad, UX/UI y Engagement

Registro detallado para **diagnóstico y rollback** de cada cambio realizado.
Todo lo listado está **desplegado en producción** (`https://nacionallibertariobiobio.cl`)
salvo indicación contraria.

**Cómo revertir en general:**
- **Frontend:** `git revert <commit>` (o volver a un commit anterior) y re-desplegar (push a `main` → Netlify reconstruye).
- **Migraciones de base de datos:** cada archivo en `supabase/migrations/` incluye su bloque `ROLLBACK` con el SQL exacto.
- **Edge Functions (Supabase):** re-desplegar la versión anterior desde el Dashboard → Edge Functions → [función] → Versions, o volver a desplegar el código previo.

Proyecto Supabase: `pnl-BD` (`kjcwozzfzbizxurppxlf`). Sitio Netlify: `pnl-biobio` (rama de producción: `main`).

---

## 🔒 SEGURIDAD

### S-01 — Autorización de admin contra la base de datos
- **Commit:** `0084b13`
- **Qué:** Las 8 páginas admin verificaban el rol con `localStorage` (manipulable). Ahora usan `window.verifyAdminAccess()` (en `shared.js`), que valida el token y consulta el rol real en `profiles`.
- **Archivos:** `shared.js`, `admin-dashboard/emails/logs/forja/foros/usuarios/votos/lecciones.html`.
- **Rollback:** `git revert 0084b13` (volvería a leer el rol desde localStorage — no recomendado).

### S-02 — Fuga de PII en `profiles` (padrón de 3.416 personas)
- **Commits:** `0084b13` (RPCs + fase 1), `7470995` (frontend), `f8cf803` (doc).
- **Migraciones:** `supabase/migrations/20260722_profiles_pii_hardening.sql` (RPCs + fixes advisors) y `20260722_profiles_pii_column_revoke.sql` (REVOKE de columnas sensibles).
- **Qué:** Un militante podía leer `rut/email/phone_number/birth_date/comuna` de todos. Se aplicó **protección a nivel de columna**: `authenticated` solo lee columnas no sensibles; el titular usa `get_my_profile()`, los admins usan `admin_list_profiles()` / `admin_event_registrations()` / `admin_lesson_registrations()`. El foro sigue mostrando nombres/rango.
- **Archivos frontend:** `auth.js`, `perfil.html`, `forja-foros.html`, `forja-foros-post.html`, `admin-usuarios.html`, `admin-forja.html`, `admin-lecciones.html`, `admin-logs.html`, `admin-dashboard.html`.
- **Rollback DB:** `GRANT SELECT ON public.profiles TO authenticated;` (restablece el acceso amplio — reabre la fuga). Frontend: `git revert 7470995`.

### S-03 — Política de contraseñas fuerte (app)
- **Commit:** `18ef2af`
- **Qué:** Mínimo 12 caracteres + complejidad + medidor de fortaleza + aviso Bloq Mayús + rechazo de comunes, en login/activación/recuperación. (El toggle "leaked password" de Supabase requiere plan Pro; no está activado.)
- **Archivos:** `public/assets/js/password-policy.js` (nuevo), `forja-login.html`, `forja-reset-password.html`.
- **Rollback:** `git revert 18ef2af`.

### S-04 — Rate-limit del formulario de contacto
- **Commit:** (esta tanda — ver `git log` más reciente)
- **Migración:** `supabase/migrations/20260723_contact_rate_limit.sql` (tabla `contact_rate_limit`).
- **Edge Function:** `contact-email` (versión 5). Antes: sin protección server-side. Ahora: máximo **5 envíos/hora por IP**, validación de email y CORS ampliado (apex + www + netlify + localhost).
- **Archivos:** `supabase/functions/contact-email/index.ts`.
- **Rollback:** re-desplegar la versión 4 de `contact-email` (Dashboard → Edge Functions → contact-email → Versions) y `DROP TABLE public.contact_rate_limit;`.

### S-05 — Mensajes de error del login genéricos
- **Commit:** `3a3fa4e`
- **Qué:** El login ya no muestra errores técnicos (`PGRST116`, mensajes de Supabase) ni permite distinguir si un correo existe. Muestra mensajes genéricos; el detalle va solo a consola/logs.
- **Archivos:** `forja-login.html`.
- **Rollback:** `git revert 3a3fa4e` (parcial: ese commit también trae S-06 y S-08).

### S-06 — Sanitizado del HTML de correos masivos
- **Commit:** `3a3fa4e`
- **Qué:** El HTML del comunicado se limpia con `window.sanitizeEmailHTML` (DOMPurify) **antes de enviarlo**, quitando `<script>`, manejadores `on*` y URLs `javascript:`. No se tocó la Edge Function `send-mass-email`.
- **Archivos:** `shared.js` (nueva función), `admin-emails.html`.
- **Rollback:** `git revert 3a3fa4e`.

### S-08 — Integridad de dependencias
- **Commit:** `3a3fa4e` (+ pin de `package.json` en esta tanda)
- **Qué:** `@supabase/supabase-js` v2.110.8 **auto-hospedado** en `public/assets/vendor/supabase-js.js` (se eliminaron 48 referencias al CDN jsdelivr en todas las páginas). `chart.js` pineado a `@4`. `package.json` con versiones exactas.
- **Archivos:** `public/assets/vendor/supabase-js.js` (nuevo) + ~24 `.html` + `admin-votos.html` + `package.json`.
- **Rollback:** `git revert` del commit correspondiente (volvería a cargar supabase-js desde el CDN).

### Extras de advisors (Supabase)
- **Migración:** `supabase/migrations/20260722_profiles_pii_hardening.sql` (incluidos aquí).
- **Qué:** `search_path=public` fijado en 5 funciones; `EXECUTE` revocado a `anon`/`authenticated` en 6 funciones de trigger que estaban expuestas como RPC.
- **Rollback:** re-`GRANT EXECUTE` sobre esas funciones (no recomendado) — ver la migración.

### Bucket `multimedia` — listado público cerrado
- **Commit:** `5e22611`
- **Migración:** `supabase/migrations/20260722_fix_multimedia_bucket_listing.sql`.
- **Qué:** Se eliminó la política SELECT que permitía a cualquiera **listar** todos los archivos. Se conservan subir/borrar (super_admin) y el acceso público por URL a cada imagen.
- **Rollback (reabrir listado):** `CREATE POLICY "Acceso público multimedia" ON storage.objects FOR SELECT USING (bucket_id = 'multimedia');`

### Contraseñas temporales con generador criptográfico
- **Edge Function:** `create-user-temp` (versión 20). Antes generaba la contraseña temporal con `Math.random()` (no criptográficamente seguro); ahora usa `crypto.getRandomValues` (16 caracteres, alfabeto sin ambiguos O/0/I/l/1).
- **Archivos:** `supabase/functions/create-user-temp/index.ts`.
- **Rollback:** re-desplegar la versión 19 desde el Dashboard → Edge Functions → create-user-temp → Versions.

### `check_email_exists` — riesgo aceptado (documentado, sin cambio)
- **Decisión:** la función RPC es ejecutable por `anon` **a propósito**, porque el flujo de **activación de cuenta** (`forja-activar.html`) la usa cuando el usuario aún NO ha iniciado sesión. Revocar el acceso anónimo rompería la activación.
- **Riesgo:** permite verificar si un correo está registrado (enumeración). Severidad baja para este contexto. Mitigación futura posible: rate-limit sobre la función o rediseñar la activación para no exponer existencia.

---

## 🎨 UX / UI

### S-09 — Rate-limit ya distribuido (sin cambios de código)
- **Commit:** (ninguno — solo documentación)
- **Qué:** El checklist marcaba el rate-limit como "en memoria". Revisión del código confirmó que `contact-email` versión 5 ya usa la tabla `contact_rate_limit` en Postgres (no un `Map` en memoria). Es distribuida por naturaleza: todas las instancias de Deno consultan la misma tabla. Se cierra el ítem sin modificaciones.

### S-10 — Tokens de sesión en sessionStorage
- **Commit:** `4af30a9`
- **Qué:** `supabase-config.js` pasa `{ auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true } }` a `createClient`. Los JWT ya no se escriben en `localStorage` (archivo en disco), sino en `sessionStorage` (solo en memoria del tab). Un atacante que robe el archivo `localStorage` del disco no obtendrá tokens válidos.
- **Tradeoff:** El usuario debe volver a iniciar sesión al reiniciar el navegador o abrir una nueva pestaña. Para un intranet partidario esta es la opción correcta.
- **Archivos:** `supabase-config.js`.
- **Rollback:** en `supabase-config.js` quitar el bloque `AUTH_OPTIONS` y reemplazar por `supabase.createClient(url, key)` sin opciones.

### S-11 — Forzar cambio de contraseña en toda la app
- **Commit:** `4af30a9`
- **Qué:** Antes solo `forja-login.html` verificaba `must_change_password` — un usuario que navega directamente a otra URL podía saltar el modal. Ahora:
  1. `shared.js` `verifyAdminAccess()`: selecciona `must_change_password` desde `profiles`; si es `true`, redirige a `forja-login.html?must_change=1` y devuelve `ok: false` antes de mostrar el panel.
  2. `public/assets/js/modules/auth.js` `initNavbar()`: después de cargar el perfil, si `must_change_password = true`, redirige. Esto cubre TODAS las páginas que incluyen `shared.js`.
  3. `forja-login.html`: detecta `?must_change=1` en la URL, espera a que Supabase cargue, consulta el perfil desde la DB y muestra el modal de cambio sin pedir login de nuevo.
- **Archivos:** `shared.js`, `public/assets/js/modules/auth.js`, `forja-login.html`.
- **Rollback:** `git revert 4af30a9` (partial — ese commit también tiene S-09/S-10; se puede revertir manualmente quitando los tres bloques de código).

### MFA / Doble Factor para admins
- **Commit:** `10555f3`
- **Qué:** Al cargar `admin-dashboard.html`, se llama `supabaseClient.auth.mfa.listFactors()`. Si el admin no tiene ningún factor TOTP verificado, aparece un banner ámbar con botón "Activar MFA". El flujo completo (enroll → QR code + clave manual → campo de código → verify) ocurre dentro del dashboard sin redirigir. Una vez verificado el código, el banner desaparece y se muestra toast de confirmación. Usa la API nativa `supabase.auth.mfa.*` de supabase-js v2.
- **Archivos:** `admin-dashboard.html`.
- **Rollback:** quitar el banner `#mfa-banner`, el modal `#mfa-modal`, la función `checkMfaStatus()` y la llamada en el init.

### Prueba social en la portada
- **Commit:** `10555f3`
- **Qué:** Nueva sección entre la directiva regional y las actividades próximas. Fondo navy (`#182d56`) con tres métricas: **3.400+ Afiliados Registrados** (cifra del padrón regional), **Biobío — Sede Regional Oficial**, **100% Democracia Interna**. Fuente Playfair Display, cifras en dorado. Nota al pie indica que el número se actualiza periódicamente.
- **Archivos:** `index.html`.
- **Rollback:** quitar el bloque `<!-- PRUEBA SOCIAL -->` de `index.html`.

### Fix URL Push en Admin Dashboard
- **Commit:** `10555f3`
- **Qué:** `sendPushNotification()` en `admin-dashboard.html` apuntaba a `/.netlify/functions/send-push` (endpoint inexistente). Corregido a `${window.supabaseClient.supabaseUrl}/functions/v1/send-push` con payload `{ title, message, url }`, igual al formato que usan `admin-anuncios.html` y `admin-votos.html`.
- **Archivos:** `admin-dashboard.html`.

### Sistema de diseño unificado
- **Commit:** (esta tanda — ver `git log`)
- **Qué:**
  - `tailwind.config.js` reescrito: `darkMode: 'media'`, fuentes `pnl-serif` (Playfair Display) y `pnl-sans` (Roboto), colores `pnl-navy`/`pnl-gold`/`pnl-dark`.
  - `input.css` reescrito completamente: importa Playfair Display + Roboto desde Google Fonts, define variables CSS (`--pnl-navy`, `--pnl-gold`, `--pnl-dark`, `--pnl-bg`, `--pnl-surface`, `--pnl-border`, `--pnl-text`, `--pnl-text-muted`, `--pnl-input-bg`), aplica `h1/h2/h3 { font-family: Playfair Display }` vía `@layer base`.
  - `index.html` + `recursos.html`: la referencia `'Sentient-Regular', serif` (fuente que no tenía archivo cargado) reemplazada por `'Playfair Display', Georgia, serif`.
  - Se elimina el `<link>` redundante a Roboto de `index.html` (ya lo carga `input.css`).
- **Archivos:** `tailwind.config.js`, `input.css`, `index.html`, `recursos.html`.
- **Rollback:** `git revert <commit>` (restaura el `tailwind.config.js` y `input.css` anteriores; los títulos vuelven a caer en serif genérico).

### Modo oscuro — ⚠️ REVERTIDO (ya no está en producción)
- **Commit original:** `5771435` · **Commit que lo elimina:** `fc78bd4` (2026-08-04).
- **Qué era:** Bloque `@media (prefers-color-scheme: dark)` completo en `input.css`. Cubría `body`, `.bg-white` → `#1e293b`, `.bg-gray-50` / `.bg-gray-100`, textos, bordes, inputs, sombras, nav, modals, tablas y editor Quill, siguiendo la preferencia del sistema operativo sin botón manual.
- **Por qué se quitó:** aplicaba overrides genéricos con `!important` sobre clases de Tailwind en todo el sitio, así que el resultado dependía de qué clases usara cada componente y quedaba inconsistente de una pantalla a otra. Ver §CORRECCIONES 2026-08-04.
- **Estado actual:** el sitio es solo modo claro (`color-scheme: light`, sin `darkMode` en `tailwind.config.js`).

### Rendimiento — imágenes a WebP
- **Commit:** (esta tanda)
- **Qué:** 19 imágenes convertidas de PNG/JPG a WebP con calidad 85 (RGB) / 90 (RGBA). Ahorros entre -14 % y -96 %. Se excluyen iconos PWA y favicon (requieren PNG/JPG por spec). Referencias actualizadas en 17 archivos HTML + `public/sw.js` (lista de caché y URL del ícono push).
- **Imágenes:** `directiva/` (5 ficheros), `logos/` (4), `backgrounds/` (6), `announcements/` (4).
- **Archivos HTML actualizados:** `index.html`, `recursos.html`, `forja.html`, `forja-eventos.html`, `forja-academia.html`, `forja-login.html`, `forja-activar.html`, `forja-player.html`, `forja-votaciones.html`, `forja-foros.html`, `forja-foros-post.html`, `admin-dashboard.html`, `admin-anuncios.html`, `admin-usuarios.html`, `admin-forja.html`, `admin-lecciones.html`, `perfil.html`.
- **Rollback:** restaurar referencias PNG/JPG en los HTML; los archivos WebP pueden coexistir sin problema.

### Notificaciones push — Eventos y Votaciones
- **Commit:** (esta tanda)
- **Qué:**
  1. **Edge Function `send-push`** (`supabase/functions/send-push/index.ts`): envía notificaciones push a todos los suscriptores activos. Implementada con Web Crypto API nativa de Deno (sin npm:web-push): ECDSA ES256 para el JWT VAPID y ECDH P-256 + HKDF + AES-GCM para el cifrado del payload. Solo admins pueden invocarla. Limpia automáticamente endpoints expirados (HTTP 410/404). Registra cada envío en `push_notifications_log`.
  2. **Migración `20260724_push_notifications_log.sql`**: tabla `push_notifications_log` con RLS (admins ALL, militantes SELECT para el badge). **Ya aplicada** a la base de datos.
  3. **`admin-anuncios.html`**: botón de campana junto a cada anuncio → llama a `notifyAboutAnnouncement()` que POST a `send-push` con título/extracto y URL de destino `/publicaciones-oficiales.html`.
  4. **`admin-votos.html`**: botón "Notificar Militantes" en votaciones abiertas → llama a `notifyAboutVote()` que POST a `send-push` con mensaje y URL `/forja-votaciones.html`.
- **Secrets VAPID requeridos (paso manual):** en el Dashboard de Supabase → Settings → Edge Functions → Secrets, deben existir:
  - `VAPID_PUBLIC_KEY` = `BG5gsJgsZ0t3Tu1GfWFYuHtDNAlkJXrMq0m_-3vPobewZaTzdqoHC8jC0elHKSyyhZ9_1Ov4VZacPUgwxEXcLuw`
  - `VAPID_PRIVATE_KEY` = (la clave privada correspondiente)
  - `VAPID_EMAIL` = correo de contacto del administrador VAPID
- **Archivos:** `supabase/functions/send-push/index.ts` (nuevo), `supabase/migrations/20260724_push_notifications_log.sql` (nuevo), `admin-anuncios.html`, `admin-votos.html`.
- **Rollback:** deshabilitar la Edge Function en el Dashboard, y `DROP TABLE IF EXISTS public.push_notifications_log;`. Los botones en los admin quedan sin efecto si la función está caída.

### Subida de fotos desde el computador (Anuncios + Correos)
- **Commit:** `c0f933b`
- **Qué:** Nuevo componente `public/assets/js/image-uploader.js` que sube al bucket `multimedia` (validación de tipo/tamaño <3MB). En Anuncios: zona de arrastrar/soltar. En Correos: el botón de imagen sube desde el PC.
- **Migración asociada:** `20260722_admin_email_recipient_count.sql` (RPC de conteo de destinatarios).
- **Archivos:** `image-uploader.js` (nuevo), `admin-anuncios.html`, `admin-emails.html`.
- **Rollback:** `git revert c0f933b`.

### Mejoras del editor de Correos
- **Commit:** `c0f933b`
- **Qué:** Conteo real de destinatarios en la confirmación, borradores automáticos + "Restaurar plantilla", validación de contenido vacío, log de errores en modal (sin `alert()`).
- **Archivos:** `admin-emails.html`.

### Portada accesible + SEO
- **Commit:** `dbdfe61`
- **Qué:** Zoom rehabilitado, login "fantasma" eliminado, `<title>` único, `canonical`/OG al dominio real, `robots.txt` + `sitemap.xml`.
- **Archivos:** `index.html`, `public/robots.txt` (nuevo), `public/sitemap.xml` (nuevo).
- **Rollback:** `git revert dbdfe61`.

### Rendimiento — carga diferida de imágenes
- **Commit:** (esta tanda)
- **Qué:** `loading="lazy"` añadido a las imágenes de 22 páginas `.html`.
- **Rollback:** `git revert` del commit correspondiente.

### Wizard de bienvenida reactivado — ⚠️ SUPERADO (simplificado el 2026-08-04)
- **Commit original:** `209b6cc` · **Commit que lo simplifica:** `49f50fc`.
- **Qué era:** se reactivó el botón de ayuda flotante + guía paso a paso (estaba comentado en `shared.js`). FAB abajo a la derecha en todas las páginas.
- **Estado actual:** el tour guiado se eliminó y quedó solo el centro de ayuda (FAB + panel de tips contextuales + accesos a Soporte y Academia). Ver §CORRECCIONES 2026-08-04.
- **⚠️ Nota:** para desactivarlo por completo, comentar `const wizard = new PNLWizard(); wizard.start();` al final de `shared.js`.

### Contraste y tamaños de fuente — WCAG AA
- **Commit:** `0a48650`
- **Qué:** Auditoría sistémica en los 28 archivos HTML fuente:
  - `text-gray-400` → `text-gray-600` (308 casos): contraste pasa de **2.85:1 a 5.74:1** sobre fondo blanco (WCAG AA requiere 4.5:1 para texto normal).
  - `text-gray-300` → `text-gray-500` (38 casos), `text-slate-400` → `text-slate-600` (5 casos).
  - `text-[9px]` → `text-[11px]` (96 casos) y `text-[10px]` → `text-[11px]` (295 casos): tamaño mínimo legible sin cambiar la estética de etiquetas en CAPS.
  - Los estados `hover:`, `focus:`, `group-hover:`, `md:` etc. **NO fueron tocados** (lookbehind negativo en la regex).
- **Rollback:** `git revert 0a48650` (un solo commit, reversible).

### Accesibilidad — foco de teclado + etiquetas de botones-ícono
- **Commits:** (dos tandas). En `shared.js`:
  - `injectFocusStyles()`: estilo global `:focus-visible` (anillo dorado, solo con teclado).
  - `enhanceIconButtonsA11y()`: pone `aria-label` automáticamente a botones/enlaces que son
    SOLO un ícono (Material Symbols) y no tenían nombre accesible (usa el `title` o un
    diccionario ícono→texto). Corre al cargar y tras el render async del navbar.
- **Rollback:** quitar los bloques `injectFocusStyles()` y `enhanceIconButtonsA11y()` de `shared.js`.
- **Pendiente:** auditoría completa de contraste y tamaños de fuente (WCAG AA).

---

## 🚀 ENGAGEMENT

### Sección pública de "Próximas Actividades"
- **Commit:** `dbdfe61`
- **Qué:** La portada muestra los próximos `regional_events` (lectura pública) como tarjetas. Se oculta sola si no hay eventos.
- **Archivos:** `index.html`.

### Dashboard de bienvenida del militante
- **Commit:** `dbdfe61`
- **Qué:** Panel superior en `forja-eventos.html` con saludo, rango + reputación, próximo evento, nº de inscripciones y accesos rápidos.
- **Archivos:** `forja-eventos.html`.

### Gamificación de la Forja
- **Commit:** (esta tanda)
- **Migración:** `supabase/migrations/20260727_gamification.sql` — añade `login_streak` + `last_activity_date` a `profiles`; crea `user_achievements` (UUID, profile_id FK, achievement_key, earned_at, UNIQUE por par) con RLS (SELECT/INSERT propio, SELECT admin).
- **Qué:**
  1. **Barra de nivel** — 5 rangos: Iniciado (0 pts) → Activista (100) → Militante (250) → Dirigente (500) → Fundador (1000+). Muestra nombre del rango actual, puntos restantes y porcentaje de progreso con barra animada.
  2. **Racha de días** — Se registra `last_activity_date` en cada visita; si fue ayer, incrementa `login_streak`; si no, reinicia a 1. Badge dorado visible si racha ≥ 2 días.
  3. **9 logros/insignias** — `bienvenido` (primera visita), `primer_evento` (inscripción a evento), `racha_7`, `racha_30`, `primer_curso` (primera lección completada), `forjador_bronce` (curso completo), `primer_diploma` (diploma descargado), `nivel_activista`, `nivel_militante`. Los ganados aparecen a color; los pendientes en gris desaturado.
  4. **`forja-eventos.html`** — Dashboard rediseñado: barra de nivel + racha + grid de logros en el panel oscuro superior.
  5. **`perfil.html`** — Nuevo panel "Mi Progreso en la Forja" antes del Centro de Privacidad: rango, racha, barra de nivel, grid completo de logros.
  6. **`forja-player.html`** — `grantAchievementPlayer()` llamado en `toggleCompletion()` (primer_curso, forjador_bronce al completar todas) y en `generateCertificate()` (primer_diploma).
- **Rollback DB:** `ALTER TABLE public.profiles DROP COLUMN IF EXISTS login_streak, DROP COLUMN IF EXISTS last_activity_date; DROP TABLE IF EXISTS public.user_achievements;`
- **Rollback frontend:** `git revert <commit>`.

---

## 🩹 CORRECCIONES — 4 de agosto de 2026

### Padrón completo por lotes en el admin de usuarios
- **Commit:** `9b5c7ac`
- **Migración:** `supabase/migrations/20260804_admin_list_profiles_stable_order.sql` (aplicada el 2026-08-04).
- **Síntoma:** el padrón mostraba solo los primeros 1.000 militantes de 3.400+.
- **Causa:** no era del código. PostgREST corta cada respuesta en `max_rows`, que Supabase fija en **1.000** por defecto, así que una sola llamada a `admin_list_profiles()` nunca podía devolver más.
- **Frontend:** `loadUsers()` trae el padrón por lotes de 1.000 con `.range()` hasta agotarlo (supabase-js lo traduce a `?offset=N&limit=1000`), con render progresivo — el primer lote ya es usable mientras cargan los siguientes. Indicador de progreso con el acumulado. Dedupe por `id` al unir lotes. Sin truncado silencioso: si un lote falla se conserva lo cargado y se avisa que el padrón quedó incompleto; si falla el primero se muestra el error original; tope de seguridad de 100 lotes, también con aviso. El filtro del buscador se extrajo a `aplicarFiltroActual()` para reaplicarlo tras cada lote sin resetear la página que el admin está mirando, y dejó de romperse con perfiles sin nombre o sin correo.
- **DB:** `admin_list_profiles()` ordenaba por `created_at DESC`, que **no es un orden total**: una importación masiva inserta todo el padrón en una transacción y `now()` da el mismo timestamp a todas las filas. Paginar con `OFFSET` sobre un orden con empates no solo duplica filas, también **saltea** militantes. Se agregó `id` como desempate y un índice sobre `(created_at DESC, id DESC)`.
- **⚠️ Orden de despliegue:** la migración va **antes** del frontend. El dedupe del cliente atrapa duplicados pero no puede recuperar filas salteadas.
- **Archivos:** `admin-usuarios.html`, `supabase/migrations/20260804_admin_list_profiles_stable_order.sql`.
- **Rollback:** `git revert 9b5c7ac` (vuelve a la llamada única, con el tope de 1.000). El SQL de rollback de la función está en la cabecera de la migración; el índice se quita con `DROP INDEX IF EXISTS public.profiles_created_at_id_desc_idx;`.

### `out.css` desactualizado — botones de la portada sin responder
- **Commit:** `bfb7e31`
- **Síntoma:** ningún botón del index respondía al clic (SERVEL, Foros, Votaciones, Forja).
- **Causa:** `out.css` no se regeneraba desde el **4 de marzo**, mientras `input.css` y `tailwind.config.js` habían cambiado el 24 de julio. Faltaban clases que usaban los componentes nuevos, así que `#pnl-spotlight` (overlay del wizard) quedaba sin `pointer-events-none` e interceptaba los clics de toda la pantalla, y el contenedor `hidden lg:flex` del navbar hacía lo mismo sobre los botones.
- **Fix:** regenerar con `npx tailwindcss -i input.css -o out.css`.
- **⚠️ Trampa del repo:** `out.css` se genera **a mano** y no hay script de npm que lo recuerde. Después de tocar `input.css`, `tailwind.config.js` o de agregar clases nuevas en HTML/JS, hay que regenerarlo o el cambio no llega a producción.
- **Rollback:** `git revert bfb7e31` (volvería a romper los botones — no recomendado).

### Modo oscuro eliminado + overlap en el dashboard de la Forja
- **Commit:** `fc78bd4`
- **Modo oscuro:** se eliminó el bloque `@media (prefers-color-scheme: dark)` de `input.css`, `darkMode` de `tailwind.config.js` y `color-scheme` volvió a `light`. Motivo: overrides genéricos con `!important` sobre clases de Tailwind daban resultados inconsistentes según el componente. No había ninguna clase `dark:` en uso, así que la remoción no arrastró nada.
- **Overlap:** en `forja-eventos.html` la tarjeta "Próximo evento" no tenía `max-width`, así que un título de evento largo estiraba su ancho intrínseco sin límite; al ser `shrink-0` dentro del flex row se quedaba con casi todo el ancho y colapsaba la columna izquierda (`flex-1 min-w-0`) a ~35 px, encimando "Tu Espacio Libertario" con el ícono. Se agregó `max-w-[220px]` y `break-words`.
- **Archivos:** `input.css`, `tailwind.config.js`, `out.css`, `forja-eventos.html`.
- **Rollback:** `git revert fc78bd4`.

### Asistente simplificado a centro de ayuda
- **Commit:** `49f50fc`
- **Síntoma:** en el panel del asistente no funcionaba nada salvo el toggle "Guía Automática", que no producía ningún cambio visible.
- **Causas (tres distintas):**
  1. **Soporte y Academia** usaban `onclick` inline dentro de un string que pasa por `sanitizeHTML()`. DOMPurify no admite atributos de evento (`ALLOWED_ATTR` en `shared.js` no los incluye), así que los borraba y los botones quedaban sin handler.
  2. **"Iniciar Guía Paso a Paso"** solo tenía pasos definidos para `index.html`; en el resto `steps` era `[]` y `showStep()` llamaba a `finish()` sin mostrar nada. Además 2 de los 4 pasos apuntaban a `#academia` y `#votaciones`, que no existen en `index.html`.
  3. **El toggle "Guía Automática"** escribía `pnl_wizard_disabled` en `localStorage` pero nadie lo leía: `start()` nunca disparó un tour automático.
- **Qué se eliminó:** todo el tour (overlay `#pnl-spotlight`, tarjeta `#pnl-guide-card`, `initSpotlight`/`showStep`/`updateSpotlight`/`createGuideCard`/`finish`, botón `#restart-tour`, toggle `#wizard-toggle`, claves `pnl_wizard_disabled` y `pnl_wizard_done`) y `window.restartWizard` de `shared.js`, que solo relanzaba el tour y no estaba referenciado en ningún lado. Motivo: el tour estaba acoplado a selectores del markup y se rompía en silencio cada vez que cambiaba el HTML.
- **Qué quedó:** FAB + panel con tips contextuales para 14 rutas, accesos a Soporte y Academia funcionando, cierre con Escape y `aria-expanded`/`aria-label` dinámicos.
- **Hallazgo extra:** el título del panel era un `<h4>` y `ALLOWED_TAGS` de `sanitizeHTML()` no permite encabezados; con `KEEP_CONTENT` el texto sobrevivía pero se perdían el tag y sus clases, así que se renderizaba sin estilo. Pasó a `<div>`.
- **Archivos:** `public/assets/js/modules/wizard.js`, `shared.js`, `out.css`.
- **Rollback:** `git revert 49f50fc` (restaura el tour roto — no recomendado).

### Anuncios: zoom de imagen e reaparición en cada carga
- **Commit:** `60e847b`
- **Síntoma:** no se podía ver la imagen completa del anuncio, y una vez cerrado no volvía a mostrarse al refrescar.
- **Causas (tres):**
  1. **Mismo patrón que el asistente:** los `onclick` de la imagen (zoom), del botón "No volver a ver este anuncio" y del botón de copiar correo, más `onload`/`onerror` de la imagen, iban inline en el string que pasa por `sanitizeHTML()`. DOMPurify los eliminaba y los tres controles quedaban muertos.
  2. **`openImageZoom()`** declaraba el overlay con `opacity:0` por **estilo inline** pero lo revelaba quitando la **clase** `opacity-0`, que nunca se agregaba. El estilo inline tiene mayor precedencia, así que el zoom se montaba en el DOM con opacidad 0 y no se veía nunca. Mismo caso con `scale-95`.
  3. **Descarte por sesión:** cerrar con la X, Escape o clic en el fondo guardaba el ID en `sessionStorage` (`pnl_session_dismissed`) y el anuncio no volvía a aparecer en toda la sesión, ni al refrescar.
- **Fix:** handlers con `addEventListener` después de insertar el modal en el DOM; transición del zoom por estilo inline en entrada y salida; eliminado el descarte por sesión — el anuncio reaparece en cada carga y lo único que lo silencia es "No volver a ver este anuncio", que persiste en `localStorage` como estaba previsto.
- **Archivos:** `public/assets/js/modules/announcements.js`.
- **Rollback:** `git revert 60e847b`.

### 📌 Patrón transversal a vigilar
Tres bugs distintos de esta tanda tuvieron la misma raíz: **`onclick` inline dentro de HTML que pasa por `sanitizeHTML()`**. DOMPurify elimina todo atributo de evento, así que cualquier handler escrito así queda mudo sin error en consola. Regla para el futuro: en HTML generado por JS y sanitizado, los eventos se enlazan **siempre** con `addEventListener` después de insertar el nodo en el DOM. Los `onclick` escritos directo en los archivos `.html` estáticos no pasan por el sanitizador y siguen siendo válidos.

---

## 🧰 Objetos creados en la base de datos (referencia rápida)

**Funciones (RPCs):** `get_my_profile`, `admin_list_profiles`, `get_dashboard_stats`,
`admin_event_registrations`, `admin_lesson_registrations`, `admin_email_recipient_count`,
`is_staff` (todas `SECURITY DEFINER`, con control de rol).

**Tablas:** `contact_rate_limit`, `push_notifications_log`, `user_achievements`.

**Índices:** `profiles_created_at_id_desc_idx` sobre `profiles (created_at DESC, id DESC)`
— sostiene el orden estable que necesita la paginación por lotes del padrón.

**Edge Functions:** `contact-email` (v5, rate-limit), `send-push` (v1, VAPID WebPush).

**Cambios de permisos:** protección de columnas en `profiles`; `EXECUTE` revocado en
funciones de trigger; política de listado del bucket `multimedia` eliminada.

Todos los `CREATE`/`GRANT`/`REVOKE` están en `supabase/migrations/` con su rollback.

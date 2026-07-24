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

### Modo oscuro
- **Commit:** (esta tanda)
- **Qué:** Bloque `@media (prefers-color-scheme: dark)` completo en `input.css`. Cubre: `body`, `.bg-white` → `#1e293b`, `.bg-gray-50` / `.bg-gray-100` → colores oscuros, textos, bordes, inputs, sombras, nav, modals, tablas, editor Quill. Respeta la preferencia del sistema operativo sin botón manual.
- **Archivos:** `input.css` (mismo commit que la unificación de diseño).
- **Rollback:** quitar el bloque `@media (prefers-color-scheme: dark)` de `input.css` y reconstruir.

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

### Wizard de bienvenida reactivado
- **Commit:** (esta tanda)
- **Qué:** Se reactivó el botón de ayuda flotante + guía opcional (estaba comentado en `shared.js`). Muestra un FAB abajo a la derecha en todas las páginas.
- **Archivos:** `shared.js` (2 bloques al final).
- **⚠️ Nota:** este wizard había sido desactivado antes "a pedido del usuario". Si se desea volver a quitar, **comentar de nuevo** las líneas `const wizard = new PNLWizard(); wizard.start();` en los dos bloques del final de `shared.js`.

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

---

## 🧰 Objetos creados en la base de datos (referencia rápida)

**Funciones (RPCs):** `get_my_profile`, `admin_list_profiles`, `get_dashboard_stats`,
`admin_event_registrations`, `admin_lesson_registrations`, `admin_email_recipient_count`,
`is_staff` (todas `SECURITY DEFINER`, con control de rol).

**Tablas:** `contact_rate_limit`, `push_notifications_log`.

**Edge Functions:** `contact-email` (v5, rate-limit), `send-push` (v1, VAPID WebPush).

**Cambios de permisos:** protección de columnas en `profiles`; `EXECUTE` revocado en
funciones de trigger; política de listado del bucket `multimedia` eliminada.

Todos los `CREATE`/`GRANT`/`REVOKE` están en `supabase/migrations/` con su rollback.

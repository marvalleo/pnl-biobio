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

**Tabla:** `contact_rate_limit`.

**Cambios de permisos:** protección de columnas en `profiles`; `EXECUTE` revocado en
funciones de trigger; política de listado del bucket `multimedia` eliminada.

Todos los `CREATE`/`GRANT`/`REVOKE` están en `supabase/migrations/` con su rollback.

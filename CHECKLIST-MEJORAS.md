# ✅ Checklist de Mejoras — PNL Biobío

Estado vivo del trabajo de seguridad, UX/UI y engagement.
`[x]` = hecho y desplegado en producción · `[ ]` = pendiente.
Última actualización: 2026-08-04.

---

## 🔒 Seguridad

### Hecho
- [x] **S-01** — Autorización de admin verificada contra la base de datos (ya no depende de `localStorage`).
- [x] **S-02** — Fuga de PII cerrada (protección a nivel de columna en `profiles` + RPCs). Verificado: un militante ya no puede leer RUT/email/teléfono de otros.
- [x] **S-03** — Política de contraseñas fuerte del lado de la app (mínimo 12, complejidad, medidor, Bloq Mayús, rechazo de comunes).
- [x] **S-05** — Mensajes de error del login genéricos (sin fugas técnicas ni enumeración de usuarios).
- [x] **S-06** — HTML de correos masivos sanitizado antes de enviar (client-side, DOMPurify).
- [x] **S-08** — `supabase-js` auto-hospedado (sin CDN externo) + `chart.js` pineado a major fijo.
- [x] **S-04** — Rate-limit por IP en el formulario de contacto (server-side, 5 envíos/hora) + validación de email + CORS ampliado.
- [x] **Extras advisors** — `search_path` fijado en funciones + `EXECUTE` revocado en funciones de trigger expuestas.
- [x] **Bucket `multimedia`** — cerrado el listado público de archivos (se conserva subir/borrar de super_admin y el acceso por URL).
- [x] **Dependencias pineadas** — versiones exactas en `package.json` (evita actualizaciones sorpresa).
- [x] **Contraseñas temporales criptográficas** — `create-user-temp` usa `crypto.getRandomValues` (antes `Math.random`).

### Pendiente
- [ ] **S-07** — Quitar `unsafe-inline` / `unsafe-eval` de la CSP. *(Refactor grande — ver explicación abajo.)*
- [x] **MFA / 2FA** para cuentas administrativas — banner en admin-dashboard muestra aviso si no está activo; flujo completo de enroll TOTP integrado en el panel.
- [~] **`check_email_exists`** — *riesgo aceptado y documentado*: es necesaria para la activación de cuenta (usuarios anónimos). Mitigación futura opcional (rate-limit).
- [ ] **Protección de contraseñas filtradas** en Supabase Auth (HaveIBeenPwned) — requiere plan Pro.
- [x] **S-09** — Rate-limit ya era distribuido: `contact-email` usa la tabla `contact_rate_limit` en DB (no memoria compartida entre instancias). Resuelto sin cambios de código.
- [x] **S-10** — Tokens de sesión movidos a `sessionStorage` (no persisten en disco entre reinicios del navegador). Implementado en `supabase-config.js` con `auth.storage = window.sessionStorage`. Tradeoff: el usuario debe volver a iniciar sesión al abrir una nueva pestaña/reiniciar el navegador.
- [x] **S-11** — Cambio de contraseña forzado en toda la app (defensa en profundidad): `verifyAdminAccess()` redirige si `must_change_password = true`; `initNavbar()` hace lo mismo desde cualquier página; `forja-login.html` detecta el redireccionamiento y muestra el modal sin requerir nuevo login.

---

## 🎨 UX / UI

### Hecho
- [x] **Carga de fotos desde el computador** en Anuncios y Correos (arrastrar/soltar → bucket `multimedia`).
- [x] **Correos** — conteo real de destinatarios en la confirmación, borradores automáticos, "Restaurar plantilla", validación de vacío, log de errores en modal.
- [x] **Portada** — zoom rehabilitado (accesibilidad), login "fantasma" eliminado, `<title>` único, `canonical`/OG al dominio real, `robots.txt` + `sitemap.xml`.
- [x] **Rendimiento** — `loading="lazy"` en imágenes (carga diferida).
- [x] **Centro de ayuda** (FAB + panel con tips contextuales por página y accesos a Soporte/Academia). El tour guiado paso a paso se eliminó el 2026-08-04: estaba acoplado a selectores del markup y sus tres controles estaban rotos.
- [x] **Accesibilidad** — foco de teclado visible (`:focus-visible`) + `aria-label` automático en botones-ícono.

- [x] **Contraste y tamaños de fuente** — auditoría WCAG AA completada: `text-gray-400` → `text-gray-600` (308 casos, de 2.85:1 a 5.74:1), `text-[9/10px]` → `text-[11px]` (391 casos). Hover/focus sin tocar.
- [x] **Unificar el sistema de diseño** — `tailwind.config.js` reescrito con fuentes y colores PNL; `input.css` con CSS vars + Playfair Display (Google Fonts) + Roboto; reemplazado `Sentient-Regular` por `Playfair Display` en `index.html` y `recursos.html`.
- [x] **Rendimiento (imágenes a WebP)** — 19 imágenes convertidas (ahorro 14 %–96 %), refs actualizadas en 17 HTML + `sw.js`.
- [~] **Modo oscuro** — *implementado y luego revertido (2026-08-04)*. Aplicaba overrides genéricos con `!important` sobre clases de Tailwind, así que el resultado dependía de qué clases usara cada componente y quedaba inconsistente entre pantallas. El sitio es solo modo claro. Si se retoma, hacerlo con tokens de diseño y clases `dark:` explícitas, no con overrides globales.
- [x] **Padrón completo en el admin de usuarios** — el listado mostraba solo los primeros 1.000 militantes por el `max_rows` de PostgREST. Ahora se trae por lotes de 1.000 con `.range()` y render progresivo; buscador, orden y paginación operan sobre el padrón completo. Requirió orden estable en `admin_list_profiles()` (desempate por `id`) para que la paginación por `OFFSET` no saltee registros.
- [x] **`out.css` regenerado** — llevaba sin compilar desde marzo y faltaban clases de los componentes nuevos, lo que dejaba overlays interceptando clics sobre los botones de la portada. ⚠️ Se genera a mano: regenerar tras tocar `input.css`, `tailwind.config.js` o agregar clases nuevas.

---

## 🚀 Engagement (retención)

### Hecho
- [x] **Sección pública de "Próximas Actividades"** en la portada (desde `regional_events`).
- [x] **Dashboard de bienvenida del militante** (saludo, rango + reputación, próximo evento, inscripciones, accesos rápidos).

### Pendiente
- [x] **Gamificar la Forja** — barra de progreso de nivel (Iniciado→Fundador con pts restantes), racha de días consecutivos, 9 logros/insignias (bienvenido, primer_evento, racha_7, racha_30, primer_curso, forjador_bronce, primer_diploma, nivel_activista, nivel_militante). Tabla `user_achievements` con RLS en DB. Mostrado en dashboard de `forja-eventos.html` y en panel "Mi Progreso" de `perfil.html`. Los diplomas ya existentes en `forja-player.html` otorgan logro `primer_diploma` automáticamente al descargar.
- [x] **Notificaciones push de eventos y votaciones** — Edge Function `send-push` desplegada (VAPID nativo Deno, cifrado AES-GCM, limpieza automática de endpoints expirados). Botón de notificación en `admin-anuncios.html` y `admin-votos.html`. Tabla `push_notifications_log` creada y con RLS. **⚠️ Requiere paso manual:** configurar `VAPID_PRIVATE_KEY` y `VAPID_EMAIL` en Supabase Dashboard → Settings → Edge Functions → Secrets.
- [ ] **Resumen semanal por correo** ("lo más comentado", "vota antes del viernes").
- [x] **Prueba social en la portada** — sección "3.400+ afiliados · Sede Regional · 100% democracia interna" entre directiva y actividades.

---

## 📌 Notas
- El informe completo y priorizado está en `informe-analisis-seguridad-ux-2026.md`.
- Todo lo marcado `[x]` está desplegado en `https://nacionallibertariobiobio.cl` y commiteado en `main`.

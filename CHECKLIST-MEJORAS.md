# ✅ Checklist de Mejoras — PNL Biobío

Estado vivo del trabajo de seguridad, UX/UI y engagement.
`[x]` = hecho y desplegado en producción · `[ ]` = pendiente.
Última actualización: 2026-07-24.

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
- [ ] **S-09** — Rate-limit de la edge function usa memoria (no compartida entre instancias) — usar store distribuido.
- [ ] **S-10** — Tokens de sesión en `localStorage` — evaluar cookies `httpOnly` (depende de S-07).
- [ ] **S-11** — Forzar cambio de contraseña obligatorio también en el servidor (hoy es solo cliente).

---

## 🎨 UX / UI

### Hecho
- [x] **Carga de fotos desde el computador** en Anuncios y Correos (arrastrar/soltar → bucket `multimedia`).
- [x] **Correos** — conteo real de destinatarios en la confirmación, borradores automáticos, "Restaurar plantilla", validación de vacío, log de errores en modal.
- [x] **Portada** — zoom rehabilitado (accesibilidad), login "fantasma" eliminado, `<title>` único, `canonical`/OG al dominio real, `robots.txt` + `sitemap.xml`.
- [x] **Rendimiento** — `loading="lazy"` en imágenes (carga diferida).
- [x] **Wizard de bienvenida reactivado** (botón de ayuda flotante + guía opcional).
- [x] **Accesibilidad** — foco de teclado visible (`:focus-visible`) + `aria-label` automático en botones-ícono.

- [x] **Contraste y tamaños de fuente** — auditoría WCAG AA completada: `text-gray-400` → `text-gray-600` (308 casos, de 2.85:1 a 5.74:1), `text-[9/10px]` → `text-[11px]` (391 casos). Hover/focus sin tocar.
- [x] **Unificar el sistema de diseño** — `tailwind.config.js` reescrito con fuentes y colores PNL; `input.css` con CSS vars + Playfair Display (Google Fonts) + Roboto; reemplazado `Sentient-Regular` por `Playfair Display` en `index.html` y `recursos.html`.
- [x] **Rendimiento (imágenes a WebP)** — 19 imágenes convertidas (ahorro 14 %–96 %), refs actualizadas en 17 HTML + `sw.js`.
- [x] **Modo oscuro** — `@media (prefers-color-scheme: dark)` completo en `input.css`: body, tarjetas, inputs, nav, tablas, modals, editor Quill.

---

## 🚀 Engagement (retención)

### Hecho
- [x] **Sección pública de "Próximas Actividades"** en la portada (desde `regional_events`).
- [x] **Dashboard de bienvenida del militante** (saludo, rango + reputación, próximo evento, inscripciones, accesos rápidos).

### Pendiente
- [ ] **Gamificar la Forja** — barra de progreso de nivel, insignias/logros, rachas, certificados descargables.
- [x] **Notificaciones push de eventos y votaciones** — Edge Function `send-push` desplegada (VAPID nativo Deno, cifrado AES-GCM, limpieza automática de endpoints expirados). Botón de notificación en `admin-anuncios.html` y `admin-votos.html`. Tabla `push_notifications_log` creada y con RLS. **⚠️ Requiere paso manual:** configurar `VAPID_PRIVATE_KEY` y `VAPID_EMAIL` en Supabase Dashboard → Settings → Edge Functions → Secrets.
- [ ] **Resumen semanal por correo** ("lo más comentado", "vota antes del viernes").
- [x] **Prueba social en la portada** — sección "3.400+ afiliados · Sede Regional · 100% democracia interna" entre directiva y actividades.

---

## 📌 Notas
- El informe completo y priorizado está en `informe-analisis-seguridad-ux-2026.md`.
- Todo lo marcado `[x]` está desplegado en `https://nacionallibertariobiobio.cl` y commiteado en `main`.

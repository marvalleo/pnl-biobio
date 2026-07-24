# ✅ Checklist de Mejoras — PNL Biobío

Estado vivo del trabajo de seguridad, UX/UI y engagement.
`[x]` = hecho y desplegado en producción · `[ ]` = pendiente.
Última actualización: 2026-07-23.

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
- [ ] **MFA / 2FA** para cuentas administrativas.
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

### Pendiente
- [ ] **Unificar el sistema de diseño** — llevar el look del index/nacional a todo el sitio (Roboto + azul `#182d56` + títulos serif). *Decisión abierta:* fuente de títulos Sentient (fiel, requiere el archivo) vs Playfair (ya disponible).
- [x] **Contraste y tamaños de fuente** — auditoría WCAG AA completada: `text-gray-400` → `text-gray-600` (308 casos, de 2.85:1 a 5.74:1), `text-[9/10px]` → `text-[11px]` (391 casos). Hover/focus sin tocar.
- [ ] **Rendimiento (imágenes a WebP)** — convertir formatos + optimizar fuentes (el `lazy` ya está hecho).
- [ ] **Modo oscuro**.

---

## 🚀 Engagement (retención)

### Hecho
- [x] **Sección pública de "Próximas Actividades"** en la portada (desde `regional_events`).
- [x] **Dashboard de bienvenida del militante** (saludo, rango + reputación, próximo evento, inscripciones, accesos rápidos).

### Pendiente
- [ ] **Gamificar la Forja** — barra de progreso de nivel, insignias/logros, rachas, certificados descargables.
- [ ] **Notificaciones push** de nuevos eventos y votaciones (la infraestructura ya existe).
- [ ] **Resumen semanal por correo** ("lo más comentado", "vota antes del viernes").
- [ ] **Prueba social en la portada** — contador de militantes, testimonios.

---

## 📌 Notas
- El informe completo y priorizado está en `informe-analisis-seguridad-ux-2026.md`.
- Todo lo marcado `[x]` está desplegado en `https://nacionallibertariobiobio.cl` y commiteado en `main`.

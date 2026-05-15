# Fixes de Seguridad Pendientes — Requieren Acción Manual

Generado: 2026-05-15. Los fixes automáticos ya fueron aplicados y commiteados.
Lo que sigue requiere acceso al dashboard de Supabase, Netlify UI, o refactors más grandes.

---

## 🔴 CRÍTICO

### 1. Supabase Dashboard — Revisar RLS en tablas del foro
**Por qué:** Si Row Level Security no está habilitado en `forum_topics`, `forum_posts`, 
`forum_post_votes`, o `quiz_questions`, cualquier usuario autenticado puede leer/escribir 
sin restricciones, saltando la lógica de autorización de la aplicación.

**Pasos:**
1. Ir a Supabase Dashboard → Table Editor → [cada tabla del foro]
2. Verificar que RLS está ON (ícono de candado cerrado)
3. Revisar las policies:
   - `forum_topics`: INSERT solo vía Netlify Function (service role); SELECT para autenticados
   - `forum_posts`: igual
   - `quiz_questions`: SELECT para autenticados; no INSERT directo desde cliente
4. Script de referencia: `docs/sql_profiles_security.sql`

---

## 🟠 ALTO

### 2. `public/assets/js/modules/auth.js` — Botón de configuración de emergencia expone prompt()
**Ubicación:** `auth.js` línea ~33, dentro del warning div cuando Supabase falla.
```js
<button onclick="localStorage.setItem('SUPABASE_URL', prompt('URL Supabase:')); ...">
```
**Riesgo:** Un atacante con acceso físico o social puede usar este botón visible en producción
para redirigir Supabase a un servidor controlado por él (credenciales phishing).

**Fix recomendado:**
- Eliminar el botón "Configurar Ahora" del warning
- Mostrar solo un mensaje estático: "Contacta al administrador técnico"
- Asegurarse de que las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` 
  estén correctamente configuradas en Netlify → Site configuration → Environment variables

**Por qué no se aplicó automáticamente:** Requiere decisión sobre si mantener algún 
mecanismo de configuración de emergencia para el equipo técnico.

### 3. Netlify Dashboard — Variables de entorno SUPABASE_ANON_KEY
**Por qué:** La refactorización de `auth.js` (netlify/functions) ahora requiere que 
`SUPABASE_ANON_KEY` esté configurada como variable de entorno en Netlify Functions 
(antes solo se necesitaba en las variables de build/front-end).

**Pasos:**
1. Netlify Dashboard → Site → Site configuration → Environment variables
2. Verificar que existe `SUPABASE_ANON_KEY` (no solo `VITE_SUPABASE_ANON_KEY`)
3. Si no existe, agregar con el mismo valor que `VITE_SUPABASE_ANON_KEY`
4. Hacer un nuevo deploy para que las funciones puedan leerla

### 4. Supabase Edge Functions — Redeploy tras cambios de CORS y auth
**Por qué:** Las funciones Supabase (`delete-user-complete`, `create-user-temp`, 
`invite-militante`, `send-mass-email`, `contact-email`) fueron modificadas pero 
necesitan ser redesplegadas manualmente.

**Pasos:**
```bash
# Desde la raíz del proyecto
supabase functions deploy delete-user-complete
supabase functions deploy create-user-temp
supabase functions deploy invite-militante
supabase functions deploy send-mass-email
supabase functions deploy contact-email
```
O desde el Supabase Dashboard → Edge Functions → [función] → Deploy.

---

## 🟡 MEDIO

### 5. CSP — Eliminar `unsafe-inline` y `unsafe-eval` (requiere refactor JS)
**Por qué:** La CSP actual tiene `'unsafe-inline'` y `'unsafe-eval'` en `script-src`, 
lo que anula gran parte de la protección. Esto es porque el proyecto usa inline scripts 
en los HTML y Quill Editor requiere eval.

**Plan para eliminar:**
1. Mover todos los `<script>` inline de los HTML a archivos `.js` modulares
2. Reemplazar Quill 1.3.6 por una versión moderna o alternativa sin eval
3. Implementar nonces en Netlify (requiere edge function o configuración avanzada)
4. Este cambio es una tarea de 2-3 días de refactor

### 6. Integrity (SRI) para scripts CDN
**Por qué:** Scripts de CDN sin `integrity` attribute pueden ser comprometidos 
si el CDN es hackeado.

**Scripts afectados (agregar `integrity` y `crossorigin="anonymous"`):**
- `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- `https://cdn.jsdelivr.net/npm/quill@1.3.6/dist/quill.js`
- `https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js`

**Pasos:**
1. Generar hash SRI: https://www.srihash.org/ o `openssl dgst -sha384 -binary <file> | openssl base64 -A`
2. Agregar al script tag: `integrity="sha384-..." crossorigin="anonymous"`

### 7. Netlify — Configurar rate limiting nativo (más robusto que la edge function actual)
**Por qué:** La edge function de rate limit actual usa un Map en memoria que no 
persiste entre instancias. Netlify ofrece rate limiting nativo más confiable.

**Pasos:**
1. Netlify Dashboard → Site → Security → DDoS protection / Rate limiting
2. Configurar límites por IP para las rutas `/.netlify/functions/*`
3. Esto complementa (no reemplaza) la edge function actual

---

## Notas de implementación

- Los commits de seguridad están en `main` branch
- `dist/` debe ser regenerado con `npm run build` para reflejar cambios en HTML
- Las Supabase Edge Functions deben ser redesplegadas manualmente (ver punto 4)
- Verificar en staging antes de producción si es posible

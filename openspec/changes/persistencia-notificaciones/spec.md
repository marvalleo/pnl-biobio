# Spec: Persistencia de Notificaciones en DB

## Goals
- Blindar el estado de lectura de notificaciones contra borrados de caché o cambios de dispositivo.
- Centralizar el historial de lectura del usuario en Supabase (`notification_reads`).

## Technical Details

### 1. Inicialización de Conteo (`updateUnreadCount`)
- Al llamar a `updateUnreadCount`, se debe obtener la lista de `notification_id` presentes en `notification_reads` para el usuario actual.
- Filtrar el conteo en base a esos IDs.

### 2. Marcado de Lectura (`showNotificationHistory`)
- Al hacer clic en un mensaje en el historial:
    1.  Verificar si el ID de la notificación ya está marcado.
    2.  Si es nuevo, realizar un `INSERT` asíncrono en `notification_reads` con el `profile_id` y `notification_id`.
    3.  Mantener la actualización visual en tiempo real en el DOM.

## Implementation Details

### `public/assets/js/modules/auth.js`
- Localización: `updateUnreadCount()` y `showNotificationHistory()`.
- Cambio clave: Reemplazar el uso exclusivo de `localStorage` con llamadas a `window.supabaseClient`.

### ⚠️ Optimización Sugerida
- Seguir usando `localStorage` para una carga instantánea mientras se realiza el `fetch` a la DB en segundo plano para sincronizar.

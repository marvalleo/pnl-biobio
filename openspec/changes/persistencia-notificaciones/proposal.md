# Proposal: Persistencia de Notificaciones en DB

## Context
Actualmente, el estado de "leído" de las notificaciones se almacena únicamente en el `localStorage` del navegador del usuario. Esto provoca que las notificaciones vuelvan a aparecer como "Nuevas" si el usuario cambia de dispositivo, borra la caché o inicia sesión en una nueva PC.

## Problem
Líneas 485 y 548 de `public/assets/js/modules/auth.js`:
```javascript
let readNotifs = JSON.parse(localStorage.getItem('pnl_read_notifs') || '[]');
// ...
localStorage.setItem('pnl_read_notifs', JSON.stringify(readNotifs));
```

## Proposed Solution
Migrar la Fuente de Verdad (Source of Truth) a la base de datos de Supabase mediante la tabla `notification_reads`.
1.  **Sincronización al Cargar**: Al abrir el historial, consultar `notification_reads` para obtener los IDs ya leídos.
2.  **Persistencia al Leer**: Al hacer clic en una notificación, realizar un `INSERT` en `notification_reads`.
3.  **Caché Híbrida**: Mantener el uso de `localStorage` para una respuesta visual instantánea (Optimistic UI), pero asegurar la persistencia en la DB.

## Risk Assessment
- Riesgo Bajo: Cambio puramente de lógica de frontend y una nueva tabla segura en DB.
- Impacto: Mejora drástica en la UX para usuarios multi-dispositivo.

# Tasks: Persistencia de Notificaciones en DB

## Tasks
- [ ] 1.1 Modificar `updateUnreadCount()` en `auth.js`: Consultar `notification_reads` para calcular el contador asíncronamente desde la DB.
- [ ] 1.2 Refactorizar `showNotificationHistory()` en `auth.js`: Realizar `INSERT` en `notification_reads` al abrir el detalle de lectura de una notificación.
- [ ] 1.3 Testing local: Marcar notificaciones en un navegador, abrir sesión en una pestaña de incógnito/otro navegador y verificar que el estado de lectura se mantenga. (Fase 4 - Testing)
- [ ] 1.4 Cerrar y archivar cambio.

# Delta for Forum

## ADDED Requirements

### Requirement: Moderacion de Contenido

The system MUST allow users to report inappropriate forum posts. The system SHALL store these reports with a default state of 'pending'. Administrators MUST be able to view, ignore, or delete reported posts.

#### Scenario: User reports a post
- GIVEN a logged-in user viewing a forum topic
- WHEN they click "Reportar" on a specific post and provide a reason
- THEN a new record is created in `forum_reports` with status 'pending'

#### Scenario: Admin resolves a report
- GIVEN an admin on the `admin-foros.html` dashboard
- WHEN they click "Eliminar" on a reported post
- THEN the post content is replaced with "[Mensaje eliminado por moderación]" and the report status changes to 'resolved'

## MODIFIED Requirements

### Requirement: Calculo de Rango y Reputación

El sistema SHALL calcular el rango del usuario (Iniciado, Bronce, Plata, Oro) mediante base de datos y proveerlo precalculado en la tabla `profiles`.
(Previously: El frontend descargaba el progreso de todas las lecciones de todos los usuarios en pantalla para calcular manualmente quién era Oro o Plata.)

#### Scenario: Mostrar foro con rangos
- GIVEN a logged-in user in `forja-foros.html`
- WHEN the topics are loaded from the database
- THEN each topic's author profile includes a pre-calculated `rank` and `reputation_score` that is directly rendered on screen

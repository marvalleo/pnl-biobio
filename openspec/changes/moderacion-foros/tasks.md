# Tasks: Moderación de Foros y Reputación

## Phase 1: Foundation / Infrastructure (Postgres)

- [x] 1.1 Añadir `report_status` ENUM y crear tabla `forum_reports` (columnas: `post_id`, `reporter_id`, `reason`, `status`, `created_at`) en `docs/sql_forum_system.sql`.
- [x] 1.2 Añadir columnas `reputation_score` (INT DEFAULT 0) y `rank` (TEXT DEFAULT 'Iniciado') a la tabla `profiles` en `docs/sql_forum_system.sql`.
- [x] 1.3 Crear funciones y triggers asociadas a `user_progress` y `forum_votes` que actualicen asíncronamente las nuevas columnas de `profiles`.
- [x] 1.4 Construir y agregar al final del documento un query ONOFF de migración para inicializar rangos de todos los usuarios actuales según la academia.

## Phase 2: Core Implementation (Frontend - Limpieza)

- [x] 2.1 En `forja-foros.html`, eliminar la función `fetchProfilesRanks()` y todo cómputo JS relacionado al cálculo masivo de rangos.
- [x] 2.2 Modificar Renderizado de Feed en `forja-foros.html` (función `loadTopics`) para que consuma e inyecte `t.profiles.rank` directamente.
- [x] 2.3 Adaptar el **Muro de Honor** en `forja-foros.html` (`loadHonorWall`) para hacer un ORDER_BY sobre la tabla `profiles` mediante rango y reputación.
- [x] 2.4 Aplicar el mismo cambio de lectura simplificada de rangos en `forja-foros-post.html`.

## Phase 3: Integration / Wiring (Flujo de Moderación)

- [x] 3.1 Agregar interfaz de Reporte: Insertar botón "Reportar" y modal en `forja-foros-post.html` que haga `INSERT` en `forum_reports` con estado 'pending'.
- [x] 3.2 Modificar UI de posteo para que renderice estética especial neutral si detecta el texto exacto "[Mensaje eliminado por moderación]".
- [x] 3.3 Conectar Supabase en `admin-foros.html`: cargar reportes dinámicamente (`SELECT * FROM forum_reports WHERE status = 'pending'`).
- [x] 3.4 Wire botón "Eliminar" en `admin-foros.html`: 1) UPDATE a `forum_posts` alterando su contenido a soft-delete, 2) UPDATE `forum_reports` a status='resolved'.
- [x] 3.5 Wire botón "Ignorar" en `admin-foros.html`: UPDATE `forum_reports` a status='ignored'.

## Phase 4: Testing & Verification

- [x] 4.1 Ejecutar Triggers/Funciones SQL en Postgres (Supabase SQL Editor) para probar la creación de `forum_reports`.
- [x] 4.2 Reportar un post real como Usuario A.
- [x] 4.3 Resolver reporte como Administrador y verificar en UI que desaparece para Admin.
- [x] 4.4 Ingresar como Usuario B al foro y ver reflejado "[Mensaje eliminado por moderación]" sin alterar al resto del hilo de conversación.
- [x] 4.5 Dar upvote a un comentario con Usuario B y verificar si el trigger alteró `reputation_score` correctamente.

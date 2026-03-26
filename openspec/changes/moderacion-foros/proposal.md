# Proposal: Moderación de Foros y Reputación

## Intent

Reemplazar la moderación simulada y el cálculo ineficiente de rangos en frontend por lógica robusta mediante Supabase (Postgres). Esto garantizará el rendimiento al cargar páginas de foros y habilitará un flujo real de denuncias para mantener una comunidad sana y escalable.

## Scope

### In Scope
- Creación de tabla `forum_reports` con estados (pending, resolved, ignored).
- Adición de `reputation_score` y `rank` a la tabla `profiles`.
- RPC en Postgres para calcular y actualizar rango basado en reportes, likes y cursos.
- Conexión de `admin-foros.html` con DB para gestionar reportes.
- Botón "Reportar" en `forja-foros-post.html` y `forja-foros.html`.

### Out of Scope
- Interfaz gráfica compleja de log de auditoría para cada acción de moderador.
- Suspensión o "baneo" automático temporal del sistema (dependerá de un admin).

## Approach

**Moderación Inteligente + Reputación Mixta vía SQL**: Implementaremos una arquitectura impulsada por base de datos, en la cual las acciones del frontend (upvote, completar curso) gatillarán funciones en Postgres (RPC o Triggers) que actualicen la reputación y rango del usuario de forma asíncrona. El frontend sólo leerá campos precalculados.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/sql_forum_system.sql` | Modified | Nuevas tablas `forum_reports` y columnas en `profiles`. |
| `admin-foros.html` | Modified | Panel real de lectura/acción sobre reportes de BD. |
| `forja-foros.html` | Modified | Reemplazar cálculo en JS por lectura directa de Rango precalculado. |
| `forja-foros-post.html` | Modified | Añadir opción de reportar post con motivo. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Spam masivo de reportes falsos | Mediano | RLS: Permitir 1 reporte por post por usuario. |
| Corrupción de rangos durante migración | Bajo | Script SQL inicial que calcule y guarde los rangos actuales antes de activar el trigger. |

## Rollback Plan

- **BD:** Revertir la migración SQL borrando tabla `forum_reports` y quitando nuevas variables. 
- **Código:** Recuperar `fetchProfilesRanks` en frontend mediante *git revert* del commit de integración.

## Dependencies

- Ninguna biblioteca externa adicional. Depende exclusivamente de Supabase rpc/triggers.

## Success Criteria

- [ ] Un reporte hecho en el foro aparece en `admin-foros.html`.
- [ ] Un administrador puede ignorar o eliminar el mensaje desde `admin-foros.html`.
- [ ] Un mensaje eliminado desaparece de la vista pública (soft-delete o hard-delete).
- [ ] El rango del perfil se lee de DB y no computando `user_progress` en `forja-foros.html`.

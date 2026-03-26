# Design: Moderación de Foros y Reputación

## Technical Approach
Refactorizar la lógica actual de moderación mockeada y el cálculo ineficiente web de rangos delegándolo al backend (Postgres). Implementaremos Triggers o RPCs en Supabase que consoliden el progreso del usuario (cursos aprobados) y "Karma" (votos) en los campos `reputation_score` y `rank` directo en `profiles`. Se construirá la tabla `forum_reports` con RLS estricta para el dashboard administrativo.

## Architecture Decisions

| Decision | Option | Tradeoffs | Choice |
|----------|--------|-----------|--------|
| **Cálculo de Rangos** | Frontend vs Triggers vs RPC | Triggers automatizan el update rápido O(1). Frontend es fácil pero genera O(N) sub-queries pesadas en el loop del feed. RPC balancea pero requiere cron. | **Triggers de Base de Datos**. Cualquier insert de diploma finalizado modificará `rank` de manera automática y transaccional. |
| **Borrado de Post Reportado** | Hard-Delete vs Soft-Delete | Hard borra el registro permanentemente rompiendo hilos. Soft-Delete (Update de flag o texto) preserva trazabilidad y contexto. | **Soft-Delete**. Reemplazaremos contenido por "Mensaje eliminado por moderación". |

## Data Flow

```text
[User] -> (Click Reportar) -> Supabase `forum_reports` (INSERT status 'pending')
[Admin] -> (admin-foros.html) -> Supabase `forum_reports` (SELECT status='pending')
[Admin] -> (Click Eliminar) -> Supabase `forum_reports` (UPDATE status='resolved') 
                       + `forum_posts` (UPDATE content="Mensaje eliminado por moderador")

[User] -> (Completar Curso Final/Upvote) -> Postgres Trigger 
                                        -> Suma reputación/rango directo en `profiles`
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `docs/sql_forum_system.sql` | Modify | Ajustar esquema final incorporando `forum_reports` y las funciones/triggers de postgres. |
| `admin-foros.html` | Modify | Carga real de reportes de DB, botones funcionales para ignorar o eliminar. |
| `forja-foros.html` | Modify | Quitar `fetchProfilesRanks`, usar `t.profiles.rank` directo. |
| `forja-foros-post.html` | Modify | Anexar botón "Reportar" en comentarios, ídem a los rangos de arriba. |

## Interfaces / Contracts

Nuevas estructuras DDL en Postgres:
```sql
CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'ignored');

CREATE TABLE public.forum_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status report_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migraciones a profiles
ALTER TABLE public.profiles ADD COLUMN reputation_score INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN rank TEXT DEFAULT 'Iniciado';
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | PG Triggers | Verificación manual iterando mediante Inserts/Updates sobre Supabase Studio o CLI. |
| E2E | Report Flow | Reportar post con User A, borrar con Admin en Dashboard, y recargar el hilo para comprobar borrado con Data B. |
| Integration | Ranking | Aprobar curso/lección en Forja y verificar actualización de la columna de rango en DB. |

## Migration / Rollout

La aplicación en producción posee perfiles que actualmente ven su rango calculado por el frontend en tiempo real. 
Se debe correr un **Script One-Off de Migración** previo a activar los triggers para pre-evaluar y settear el rango de los actuales afiliados según su `user_progress` histórico.

## Open Questions

- [ ] ¿Los reportes afectarán directamente o penalizarán el `reputation_score` automáticamente? (Provisoriamente: **No**, el karma sólo sube o baja por upvotes directos, no reportes).

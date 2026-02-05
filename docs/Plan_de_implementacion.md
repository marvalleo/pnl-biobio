```markdown
# Plan de Implementación: Soberanía Digital PNL (MVP)

Este proyecto consiste en una **PWA (Progressive Web App)** para dotar al Partido Nacional Libertario Biobío de una infraestructura de comunicación, formación y toma de decisiones independiente.

## Fases del Proyecto
1. **Fase 1: Identidad y Repositorio** (Semanas 1-2)
   - Setup de Supabase (Tablas `profiles`, `documents`).
   - Autenticación con RUT y validación de afiliados.
   - Biblioteca Digital para estatutos y documentos.
2. **Fase 2: Participación** (Semanas 3-4)
   - Motor de consultas y votación anónima.
   - Foros de debate temáticos.
3. **Fase 3: Academia** (Semanas 5-6)
   - Módulo de cursos y seguimiento de progreso.

## Estrategia Técnica
- **Frontend**: Vanilla JS (PWA enabled) con Service Workers para modo offline.
- **Backend/DB**: Supabase (PostgreSQL) con políticas de seguridad RLS estricto.
```

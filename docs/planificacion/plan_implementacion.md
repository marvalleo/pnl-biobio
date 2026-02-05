# Plan de Implementación: Soberanía Digital PNL (MVP)

Este proyecto, denominado **"MVP PNL"** o **"Soberanía Digital"**, consiste en una **PWA (Progressive Web App)** diseñada para dotar al Partido Nacional Libertario Biobío de una infraestructura de comunicación, formación y toma de decisiones independiente de las "Big Tech".

## Visión del Proyecto
**Resultado Final**: Una Sede Digital robusta y resiliente, accesible desde cualquier smartphone, que centraliza la identidad del militante, la formación doctrinal y la participación democrática.

### Criterios de Éxito
1. **Soberanía Política**: Distribución vía PWA para evitar censura en App Stores.
2. **Seguridad Robusta**: Validación de identidad por RUT y cifrado de datos críticos (AES-256).
3. **Participación Real**: Un sistema de consultas que garantice el anonimato del voto.
4. **Formación Doctrinal**: Biblioteca y cursos accesibles offline.

## Estrategia de Entrega de Cursos
Para maximizar la retención y participación en un entorno político dinámico, utilizaremos las siguientes metodologías:
- **Microlearning**: Lecciones de 5 a 10 minutos enfocadas en conceptos únicos (ej: "Principios de la Propiedad Privada").
- **Formatos Híbridos**: Combinación de videos cortos alojados (YouTube/Vimeo) con guías en PDF descargables.
- **Evaluación Rápida**: Quizzes de 3 preguntas al final de cada módulo para validar comprensión.
- **Conectividad con Foros**: Cada curso tendrá un hilo de discusión vinculado para resolver dudas en comunidad.

## Diagnóstico de Ejecución
- **Hito de Momentum**: Configuración del esquema de base de datos en Supabase y primera página de Login funcional. Esto permitirá visualizar el flujo de acceso de inmediato.
- **Zonas de Fricción**: 
    - **Validación de Padrón**: Sincronización segura del RUT con el padrón de afiliados oficial.
    - **Offline-First**: Implementar Service Workers para que la "Biblioteca de la Libertad" funcione sin conexión.

## Diseño de la Arquitectura (PWA)
- **Frontend**: Vanilla JS (PWA enabled) con Service Workers para caching.
- **Backend/DB**: Supabase (PostgreSQL) con RLS estricto.
- **Soberanía**: Alojamiento en nodos locales (Chile) para baja latencia.

## Definición de MVP (Producto Mínimo Viable)
Para la primera versión, nos enfocaremos en lo esencial:
- **Foros**: Registro de usuarios, creación de temas en 2 categorías principales, respuestas simples y borrado por admin.
- **Cursos**: Listado de hasta 3 cursos iniciales, visualización de videos/texto y un botón de "Completar lección" que guarde el progreso en la nube.
- **Auth**: Login y Registro con validación manual o automática por dominio.

## Plan por Fases

### Fase 1: Núcleo de Identidad y Repositorio (Semanas 1-2)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| **Setup Supabase** | Configuración de tablas `profiles`, `documents` y `courses`. | Dashboard Config |
| **Gatekeeper Identity** | Registro/Login con validación de RUT y 2FA básico. | `auth.js` |
| **Biblioteca Digital** | Carga y visualización de estatutos y minutas (PDF/Text). | `biblioteca.html` |

### Fase 2: Participación y Comunidad (Semanas 3-4)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| **Motor de Consultas** | Sistema de votación binaria (MVP) con anonimato por hash. | `votar.html` |
| **Círculos de Debate** | Foros temáticos y territoriales con moderación básica. | `comunidad.html` |
| **Dashboard PWA** | Pantalla principal con feed de noticias y acciones urgentes. | `dashboard.html` |

### Fase 3: Academia y "Marcha Blanca" (Semanas 5-6)
| Tarea | Descripción | Entregable |
|-------|-------------|------------|
| **Módulo Academia** | Seguimiento de progreso en cursos (3 cursos iniciales). | `academia.html` |
| **Pruebas de Seguridad** | Auditoría interna de RLS y encriptación. | Reporte QA |
| **Lanzamiento Beta** | Marcha blanca con un grupo de 20 militantes. | Deployment |

## Cronograma Estimado
| Fase | Actividad | Tiempo |
|------|-----------|--------|
| **Fase 1** | Arquitectura de Datos y Supabase Setup | 1 Semana |
| **Fase 2** | Autenticación y Gatekeeper de Miembros | 1 Semana |
| **Fase 3** | Desarrollo de Foros (MVP) | 1.5 Semanas |
| **Fase 4** | Desarrollo de Cursos y Progreso (MVP) | 1.5 Semanas |
| **Total** | **Lanzamiento Versión 1.0 (MVP)** | **5 Semanas** |

## Matriz de Riesgos
| Riesgo | Impacto | Plan de Mitigación |
|--------|---------|---------------------|
| Usuarios no autorizados acceden a info sensible | Alto | Aplicar Row Level Security (RLS) estricto en Supabase por cada tabla. |
| Inconsistencia visual al integrar JS dinámico | Medio | Crear un sistema de componentes CSS reutilizables para las nuevas secciones. |
| Lentitud en la carga de foros grandes | Bajo | Implementar paginación desde el inicio en las consultas a la DB. |

## Checklist Final (Zero Waste)
- [ ] ¿El RLS de Supabase bloquea lecturas anónimas en todas las tablas sensibles?
- [ ] ¿Los roles (Admin/SuperUser) pueden crear contenido sin entrar al Dashboard de Supabase?
- [ ] ¿El sistema de cursos registra el avance individual de cada lección?
- [ ] ¿Es responsivo y legible en dispositivos móviles (iPhone/Android)?
- [ ] ¿El código está modularizado para facilitar el mantenimiento futuro?

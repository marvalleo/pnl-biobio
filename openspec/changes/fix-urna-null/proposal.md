# Proposal: Fix Urna Digital Null error (forEach)

## Context
La página `forja-votaciones.html` está fallando al cargar el feed de votaciones cuando el usuario no ha emitido ningún voto previo (`ballots` es null). Esto genera un error JS que bloquea el renderizado de la UI de votación ("Cannot read properties of null (reading 'forEach')").

## Problem
Línea 206 de `forja-votaciones.html`:
```javascript
ballotsRes.data.forEach(b => votedMap.set(b.vote_id, b));
```
Si `ballotsRes.data` es `null` (lo cual ocurre cuando no hay registros para el `profile_id`), el método `forEach` falla.

## Proposed Solution
Aplicar un patrón de defensa contra valores nulos en la respuesta de Supabase mediante:
1. Short-circuiting (`ballotsRes.data || []`) o Optional Chaining (`ballotsRes.data?.forEach`).
2. Robustecer el manejo de errores en `loadVotes` para evitar que la UI quede en blanco.

## Risk Assessment
- Riesgo Bajo: Cambio puramente de lógica de frontend.
- Impacto: Permite a nuevos usuarios participar en procesos electorales.

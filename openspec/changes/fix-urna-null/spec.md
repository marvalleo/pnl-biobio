# Spec: Fix Urna Digital Null error (forEach)

## Goals
- Blindar la función `loadVotes` en `forja-votaciones.html` contra respuestas nulas de Supabase.
- Asegurar que el feed de votaciones se cargue aunque el usuario no tenga votos registrados.

## Technical Details

### 1. Manejo de nulidad en `ballotsRes.data`
- Se debe asegurar que el iterador `forEach` no sea llamado sobre un objeto nulo.
- En `forja-votaciones.html`, línea 206, se aplicará el operador de cortocircuito `|| []` para que, en caso de que sea `null`, se trabaje con un array vacío.

### 2. Guardián en `votesRes.data`
- Se debe verificar que `votesRes.data` sea un array antes de ejecutar `.map`. 
- Se debe manejar apropiadamente el mensaje de "No hay votaciones activas" si la lista está vacía.

## Implementation Details

### `forja-votaciones.html`
- Localización: `loadVotes()` (alrededor de la línea 204-206).
- Cambio sugerido: 
```javascript
const votes = votesRes.data || [];
const votedMap = new Map();
(ballotsRes.data || []).forEach(b => votedMap.set(b.vote_id, b));
```

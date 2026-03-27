# Spec: Botón de Afiliación Servel

## Goals
- Facilitar el proceso de afiliación legal de los usuarios mediante un enlace directo al portal del SERVEL.
- Mantener la cohesión visual con el diseño actual de la plataforma (Sede Biobío).
- Ubicar el botón en una posición estratégica y de alta visibilidad antes de las herramientas internas.

## Technical Details

### 1. Elemento Visual
- **Clase**: `.btn-servel` (estilos personalizados basados en la paleta dorada/negra).
- **Contenido**: 
    - Icono: `how_to_reg` (Material Symbols).
    - Texto: "AFILIACIÓN OFICIAL SERVEL".
- **Comportamiento**: 
    - `target="_blank"` para abrir en pestaña nueva.
    - Hover con escala (1.05) y cambio de sombra.

### 2. Ubicación en DOM
- Archivo: `index.html`.
- Padre: `<div class="container">` dentro de `<section class="section interactions-section">`.
- Inserción: Antes del párrafo descriptivo (`line 436`).

## Estilos CSS (Inline o en `<style>`)
```css
.btn-servel {
    background-color: #fba931;
    color: white !important;
    font-family: 'Sentient-Regular', serif;
    font-weight: 900;
    padding: 15px 30px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-decoration: none;
    max-width: 400px;
    margin: 0 auto 30px auto;
    box-shadow: 0 4px 15px rgba(251, 169, 49, 0.3);
    transition: all 0.3s ease;
    border: 2px solid transparent;
}

.btn-servel:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 25px rgba(251, 169, 49, 0.4);
    background-color: #ffb84d;
}
```

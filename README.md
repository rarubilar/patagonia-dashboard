# Mapa Interactivo Brasil - Patagonia

Dashboard interactivo de apoyo al estudio de prefactibilidad de conectividad aérea directa Brasil - Patagonia
(División de Fomento e Industria, Gobierno Regional de Aysén).

**En vivo:** https://rarubilar.github.io/patagonia-dashboard/mapa

## Estructura

- `mapa.html`: la página completa (datos, mapa Leaflet y gráficos Chart.js). Se publica en `/mapa`.
- `index.html`: redirige la raíz del sitio a `/mapa`.
- `images/`: fotos de destinos, puntos de interés y paneles.
- `lib/`: librerías fijadas (Leaflet 1.9.4, Chart.js 4.5.1, chartjs-plugin-datalabels 2.2.0), copiadas desde npm.
- `assets/css/tailwind.min.css`: Tailwind CSS 3 precompilado a partir de las clases usadas en `mapa.html`.

## Publicación

GitHub Pages sirve la rama `main` tal cual (sitio estático, `.nojekyll`). No requiere build en el servidor.

## Editar

Tras cambiar clases de Tailwind en `mapa.html`, regenerar el CSS y probar:

```bash
npm install
npm run build:css     # regenera assets/css/tailwind.min.css
npm test              # prueba de humo en Chromium (escritorio y móvil)
```

`npm run vendor` vuelve a copiar las librerías de `node_modules` a `lib/` (al actualizar versiones en `package.json`).
`node scripts/optimize-images.mjs` (requiere `npm i --no-save sharp`) recomprime fotos nuevas en `images/`.

El botón "Ver estudio de mercado completo" se oculta mientras `MARKET_STUDY_URL` (en `mapa.html`) esté vacío.

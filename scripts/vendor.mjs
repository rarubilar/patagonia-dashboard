// Copies the pinned front-end libraries from node_modules into lib/ so the
// published page does not depend on unpinned third-party CDNs.
import { cpSync, mkdirSync } from 'node:fs';

const files = [
  ['node_modules/leaflet/dist/leaflet.js', 'lib/leaflet/leaflet.js'],
  ['node_modules/leaflet/dist/leaflet.css', 'lib/leaflet/leaflet.css'],
  ['node_modules/leaflet/dist/images', 'lib/leaflet/images'],
  ['node_modules/chart.js/dist/chart.umd.min.js', 'lib/chart.js/chart.umd.min.js'],
  ['node_modules/chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js', 'lib/chartjs-plugin-datalabels/chartjs-plugin-datalabels.min.js'],
];
for (const [from, to] of files) {
  mkdirSync(to.substring(0, to.lastIndexOf('/')), { recursive: true });
  cpSync(from, to, { recursive: true });
}
console.log('Vendored', files.length, 'entries into lib/');

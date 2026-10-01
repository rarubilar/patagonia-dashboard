/** Tailwind is prebuilt into assets/css/tailwind.min.css (run `npm run build:css`)
 *  instead of using the Play CDN, which is not meant for production. */
module.exports = {
  content: ['./mapa.html', './index.html'],
  theme: { extend: {} },
  plugins: [],
};

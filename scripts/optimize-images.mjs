// Re-encodes the photos in images/ in place (max 1920px wide, progressive JPEG q80).
// Only rewrites a file when the result is meaningfully smaller. Requires `npm i --no-save sharp`.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const walk = d => readdirSync(d).flatMap(f => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let before = 0, after = 0;
for (const file of walk('images').filter(f => /\.jpe?g$/i.test(f))) {
  const input = readFileSync(file);
  const output = await sharp(input).rotate().resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer();
  before += input.length;
  if (output.length < input.length * 0.9) { writeFileSync(file, output); after += output.length; } else after += input.length;
}
console.log(`images: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);

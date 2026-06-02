import { cpSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const copies = [
  ['views', 'dist/views'],
  ['public', 'dist/public'],
];

for (const [from, to] of copies) {
  const src = resolve(root, from);
  if (existsSync(src)) {
    cpSync(src, resolve(root, to), { recursive: true });
    console.log(`copied ${from} -> ${to}`);
  }
}

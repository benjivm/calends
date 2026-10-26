// vue-tsc emits `from './X.vue'` next to `X.vue.d.ts`, which `nodenext` resolution can't pair up,
// so every component types as `any` there. `./X.vue.js` resolves under both nodenext and bundler.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);

for (const name of readdirSync(dist)) {
    if (!name.endsWith('.d.ts')) continue;

    const file = new URL(name, dist);
    const source = readFileSync(file, 'utf8');
    const fixed = source.replace(/(from (['"])\.\/[\w-]+\.vue)\2/g, '$1.js$2');

    if (fixed !== source) writeFileSync(file, fixed);
}

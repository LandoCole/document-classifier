// Writes samples/index.json (file, type, title, words) for the demo's sample menu. Rerun after adding samples.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ALL_TYPES } from '../src/vocabulary.js';

const dir = fileURLToPath(new URL('../samples/', import.meta.url));
const codes = new Set(ALL_TYPES.map(t => t.code));
const index = [];
for (const file of (await readdir(dir)).filter(f => f.endsWith('.md')).sort()) {
  const src = await readFile(dir + file, 'utf8');
  const m = /^---\ntype: (.+)\ntitle: (.+)\n---\n([\s\S]*)$/.exec(src);
  if (!m || !codes.has(m[1].trim())) throw new Error(`${file}: needs front matter with a known type and a title`);
  index.push({ file, type: m[1].trim(), title: m[2].trim().replace(/^"|"$/g, ''), words: m[3].split(/\s+/).filter(Boolean).length });
}
await writeFile(dir + 'index.json', JSON.stringify(index, null, 1) + '\n');
console.log(`indexed ${index.length} samples`);

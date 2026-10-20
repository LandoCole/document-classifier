import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { ALL_TYPES } from '../src/vocabulary.js';

const dir = new URL('../samples/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', dir)));

test('the sample index lists every sample with a known type', () => {
  const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  assert.deepEqual(index.map(s => s.file), files, 'run node scripts/index-samples.js');
  const codes = new Set(ALL_TYPES.map(t => t.code));
  for (const s of index) assert.ok(codes.has(s.type), s.file);
});

test('every type has at least one sample', () => {
  const have = new Set(index.map(s => s.type));
  for (const t of ALL_TYPES) assert.ok(have.has(t.code), t.code);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settle, wander } from '../src/settle.js';

const ranked = [{ code: 'a', probability: 0.7 }, { code: 'b', probability: 0.25 }, { code: 'c', probability: 0.05 }];

test('the settle ends on the choice and slows down', () => {
  const s = settle(ranked, 'a', { rng: () => 0.5 });
  assert.equal(s.at(-1).code, 'a');
  for (let i = 1; i < s.length; i++) assert.ok(s[i].delay >= s[i - 1].delay);
});

test('the settle only visits likely types', () => {
  const seen = new Set();
  let x = 0.1;
  for (let n = 0; n < 200; n++) settle(ranked, 'a', { rng: () => (x = (x * 9301 + 49297) % 233280 / 233280) }).forEach(h => seen.add(h.code));
  assert.ok([...seen].every(c => ['a', 'b', 'c'].includes(c)));
});

test('wandering never repeats a type twice in a row', () => {
  const next = wander(['a', 'b', 'c']);
  let prev = next();
  for (let i = 0; i < 100; i++) { const c = next(); assert.notEqual(c, prev); prev = c; }
});

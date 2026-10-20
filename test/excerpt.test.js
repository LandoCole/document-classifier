import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excerpt, approxTokens, LIMITS } from '../src/excerpt.js';

const para = n => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

test('a short document goes whole', () => {
  const ex = excerpt('# Title\nSome text.', 2);
  assert.equal(ex.strategy, 'whole');
  assert.equal(ex.text, '# Title\nSome text.');
  assert.equal(ex.pages, 2);
  assert.equal(ex.tokens, ex.totalTokens);
});

test('a long document with headings becomes an outline under budget', () => {
  const sections = Array.from({ length: 40 }, (_, i) => `## Section ${i}\nFirst sentence of section ${i}. ${para(600)}`);
  const ex = excerpt(`# Big report\n${para(800)}\n${sections.join('\n\n')}`);
  assert.equal(ex.strategy, 'outline');
  assert.ok(ex.totalTokens > LIMITS.maxTokens);
  assert.ok(ex.tokens <= LIMITS.maxTokens);
  assert.match(ex.text, /## Section 20\nFirst sentence of section 20\./);
  assert.ok(ex.text.startsWith('# Big report'));
});

test('a long document without headings keeps its two ends', () => {
  const md = `START ${para(30000)} END`;
  const ex = excerpt(md);
  assert.equal(ex.strategy, 'split');
  assert.ok(ex.text.startsWith('START') && ex.text.endsWith('END'));
  assert.ok(ex.text.includes('[…]'));
  assert.ok(ex.tokens <= LIMITS.maxTokens + 10);
});

test('tokens are estimated at four characters each', () => {
  assert.equal(approxTokens('abcd'), 1);
  assert.equal(approxTokens('abcde'), 2);
});

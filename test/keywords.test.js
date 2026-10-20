import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyByKeywords, RULES } from '../src/keywords.js';
import { TYPES } from '../src/vocabulary.js';

test('every type has rules', () => {
  assert.deepEqual(Object.keys(RULES).sort(), TYPES.map(t => t.code).sort());
});

test('obvious documents match their type', () => {
  assert.equal(classifyByKeywords('FORM 10-K ANNUAL REPORT for the fiscal year ended December 31').type, 'annual_report_10k');
  assert.equal(classifyByKeywords('Trade confirmation. You bought 100 shares. Trade date 3/1, settlement date 3/3.').type, 'trade_confirmation');
});

test('no hits means other', () => {
  assert.equal(classifyByKeywords('A recipe for banana bread').type, 'other');
});

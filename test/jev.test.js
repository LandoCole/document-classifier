import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, parseResponse, classify, JevError, JEV_PRICE_PER_MTOK } from '../src/jev.js';
import { ALL_TYPES } from '../src/vocabulary.js';
import { excerpt } from '../src/excerpt.js';

const ex = excerpt('# FORM 4\nStatement of changes in beneficial ownership');
const answer = (choice, extra = {}) => ({
  model: 'jev-1.13.0',
  answers: { document_type: { type: 'choice', choice, confidence: 0.9,
    probabilities: { insider_transaction_form4: 0.9, beneficial_ownership_13d: 0.08, other: 0.02 }, ...extra } },
  usage: { input_tokens: 1500, output_tokens: 0 },
});
const fakeFetch = (status, body, headers = {}) => async () => new Response(JSON.stringify(body), { status, headers });

test('one choice question over every type, with the excerpt in state', () => {
  const req = buildRequest(ex, { model: 'jev-x' });
  assert.equal(req.model, 'jev-x');
  assert.equal(req.state.document, ex.text);
  assert.equal(req.state.excerpt_note, 'This is the whole document.');
  const q = req.questions.document_type;
  assert.equal(q.type, 'choice');
  assert.deepEqual(Object.keys(q.criteria), ALL_TYPES.map(t => t.code));
});

test('the answer is ranked by probability with labels', () => {
  const r = parseResponse(answer('insider_transaction_form4'), buildRequest(ex));
  assert.equal(r.type, 'insider_transaction_form4');
  assert.equal(r.label, 'Insider transaction (Form 4)');
  assert.deepEqual(r.ranked.map(x => x.code), ['insider_transaction_form4', 'beneficial_ownership_13d', 'other']);
  assert.equal(r.inputTokens, 1500);
});

test('an answer outside the vocabulary is rejected', () => {
  assert.throws(() => parseResponse(answer('poem'), buildRequest(ex)), e => e.code === 'invalid_output');
  assert.throws(() => parseResponse({ answers: {} }, buildRequest(ex)), JevError);
});

test('classify sends the key and reports latency and cost', async () => {
  let sent;
  const r = await classify(ex, { apiKey: 'k', baseUrl: 'https://x.test/', fetch: async (url, init) => {
    sent = { url, init };
    return new Response(JSON.stringify(answer('insider_transaction_form4')), { headers: { 'x-typesafe-request-id': 'req_1' } });
  } });
  assert.equal(sent.url, 'https://x.test/v1/systemone');
  assert.equal(sent.init.headers.authorization, 'Bearer k');
  assert.equal(r.requestId, 'req_1');
  assert.ok(r.latencyMs >= 0);
  assert.equal(r.costUsd, 1500 * JEV_PRICE_PER_MTOK / 1e6);
});

test('HTTP failures map to error codes', async () => {
  const code = async (status, headers) => classify(ex, { apiKey: 'k', fetch: fakeFetch(status, {}, headers) }).catch(e => e);
  assert.equal((await code(401)).code, 'auth');
  const limited = await code(429, { 'retry-after': '3' });
  assert.equal(limited.code, 'rate_limited');
  assert.equal(limited.retryAfter, 3);
  assert.equal((await code(400)).code, 'bad_request');
  assert.equal((await code(500)).code, 'unavailable');
  assert.equal((await classify(ex, { apiKey: '' }).catch(e => e)).code, 'config');
  const offline = await classify(ex, { apiKey: 'k', fetch: async () => { throw new TypeError('fetch failed'); } }).catch(e => e);
  assert.equal(offline.code, 'unavailable');
});

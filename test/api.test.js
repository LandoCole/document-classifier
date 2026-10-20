import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../api/classify.js';

const post = (body, ip = '9.9.9.9') => POST(new Request('http://x/api/classify', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': ip }, body: typeof body === 'string' ? body : JSON.stringify(body),
}));

test('classifies an excerpt without exposing the key', async (t) => {
  process.env.TYPESAFE_API_KEY = 'secret-key';
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.headers.authorization, 'Bearer secret-key');
    return new Response(JSON.stringify({ model: 'jev-1.13.0', usage: { input_tokens: 1200 },
      answers: { document_type: { type: 'choice', choice: 'trade_confirmation', confidence: 0.97, probabilities: { trade_confirmation: 0.97, brokerage_statement: 0.03 } } } }));
  });
  const res = await post({ text: 'You bought 100 shares', strategy: 'whole' }, '1.1.1.1');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.type, 'trade_confirmation');
  assert.ok(!JSON.stringify(body).includes('secret-key'));
});

test('rejects bad input', async () => {
  assert.equal((await post('not json', '2.2.2.2')).status, 400);
  assert.equal((await post({ text: '', strategy: 'whole' }, '2.2.2.2')).status, 400);
  assert.equal((await post({ text: 'x', strategy: 'everything' }, '2.2.2.2')).status, 400);
  assert.equal((await post({ text: 'x'.repeat(300_000), strategy: 'whole' }, '2.2.2.2')).status, 413);
});

test('rate-limits a visitor', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 500 }));
  process.env.TYPESAFE_API_KEY = 'k';
  for (let i = 0; i < 10; i++) await post({ text: 'x', strategy: 'whole' }, '3.3.3.3');
  const res = await post({ text: 'x', strategy: 'whole' }, '3.3.3.3');
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('retry-after')) > 0);
});

test('maps a Jev outage to 503 with no detail', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 500 }));
  t.mock.method(console, 'error', () => {});
  const res = await post({ text: 'x', strategy: 'whole' }, '4.4.4.4');
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, 'unavailable');
});

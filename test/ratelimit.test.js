import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimiter, clientKey } from '../src/ratelimit.js';

test('limits per minute, then lets the visitor back in', () => {
  let t = 1_000_000;
  const hit = rateLimiter({ perMinute: 2, perDay: 100, now: () => t });
  assert.equal(hit('a'), 0);
  assert.equal(hit('a'), 0);
  assert.ok(hit('a') > 0);
  assert.equal(hit('b'), 0, 'other visitors are unaffected');
  t += 61_000;
  assert.equal(hit('a'), 0);
});

test('limits per day', () => {
  let t = 0;
  const hit = rateLimiter({ perMinute: 100, perDay: 3, now: () => t });
  for (let i = 0; i < 3; i++) { assert.equal(hit('a'), 0); t += 61_000; }
  assert.ok(hit('a') > 0);
  t = 86_400_000;
  assert.equal(hit('a'), 0);
});

test('client key takes the first address and buckets IPv6 by /64', () => {
  assert.equal(clientKey('1.2.3.4, 10.0.0.1'), '1.2.3.4');
  assert.equal(clientKey('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2');
  assert.equal(clientKey(null), 'unknown');
});

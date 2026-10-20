// POST /api/classify — the demo's server side, as a Vercel function (Web Request/Response).
//
// The browser reads the file and sends only an excerpt of its text; the API key stays here. The
// vocabulary and question are fixed on this side, so the endpoint can't be used as an open proxy to
// Jev. Excerpt text is never logged.
//
// Environment: TYPESAFE_API_KEY (required), TYPESAFE_BASE_URL and JEV_MODEL (optional).
import { classify, JevError } from '../src/jev.js';
import { approxTokens, LIMITS } from '../src/excerpt.js';
import { rateLimiter, clientKey } from '../src/ratelimit.js';

const MAX_BODY_BYTES = 200 * 1024;
const MAX_TEXT_CHARS = (LIMITS.maxTokens + 2000) * 4;
const STRATEGIES = new Set(['whole', 'outline', 'split']);
const limit = rateLimiter({ perMinute: 10, perDay: 100 });

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

const STATUS = { config: 503, auth: 503, rate_limited: 429, too_long: 413, bad_request: 400, unavailable: 503, timeout: 504, invalid_output: 502 };

export async function POST(request) {
  const wait = limit(clientKey(request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')));
  if (wait) return json(429, { error: 'rate_limited', message: 'Too many documents for now. Try again shortly.' }, { 'retry-after': String(wait) });

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json(413, { error: 'too_long', message: 'That excerpt is too large.' });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'too_long', message: 'That excerpt is too large.' });

  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'bad_request', message: 'Send JSON.' }); }
  const { text, strategy, pages = 1, totalTokens } = body ?? {};
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_CHARS || !STRATEGIES.has(strategy))
    return json(400, { error: 'bad_request', message: 'Send { text, strategy } with text under the size limit.' });

  const ex = { text, strategy, tokens: approxTokens(text), totalTokens: Number(totalTokens) || approxTokens(text), pages: Number(pages) || 1 };
  try {
    const result = await classify(ex, {
      apiKey: process.env.TYPESAFE_API_KEY,
      baseUrl: process.env.TYPESAFE_BASE_URL || undefined,
      model: process.env.JEV_MODEL || undefined,
    });
    return json(200, result);
  } catch (e) {
    const code = e instanceof JevError ? e.code : 'unavailable';
    if (!(e instanceof JevError)) console.error('classify failed:', e?.name);
    else console.error('classify failed:', code, e.status ?? '');
    const status = STATUS[code] ?? 503;
    const message = code === 'rate_limited' ? 'The classifier is busy. Try again in a moment.'
      : code === 'timeout' ? 'The classifier took too long. Try again.'
      : 'The classifier is unavailable right now.';
    return json(status, { error: code, message }, e.retryAfter ? { 'retry-after': String(e.retryAfter) } : {});
  }
}

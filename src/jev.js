// Document-type classification with Jev, TypeSafe's decision model.
//
// One request, one `choice` question: Jev reads the excerpt once and returns a probability for every
// type in the vocabulary. It doesn't generate text, so there's nothing to parse or validate beyond
// the typed answer, and output tokens are free. Uses fetch only, so it runs in Node 18+ and edge runtimes.
import { ALL_TYPES, labelFor } from './vocabulary.js';
import { EXCERPT_NOTES } from './excerpt.js';

export const DEFAULT_BASE_URL = 'https://api.typesafe.ai';
export const DEFAULT_MODEL = 'jev-latest';
/** Jev's list price in US dollars per million input tokens (output is free). */
export const JEV_PRICE_PER_MTOK = 0.042;

/** A failed call. `code` is one of: config, auth, rate_limited, too_long, bad_request, unavailable, timeout, invalid_output. */
export class JevError extends Error {
  constructor(code, message, { status, retryAfter } = {}) {
    super(message);
    this.name = 'JevError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * The request body for one excerpt.
 * @param {import('./excerpt.js').Excerpt} ex
 * @param {{ model?: string, types?: typeof ALL_TYPES }} [opts]
 */
export function buildRequest(ex, { model = DEFAULT_MODEL, types = ALL_TYPES } = {}) {
  return {
    model,
    state: { document: ex.text, excerpt_note: EXCERPT_NOTES[ex.strategy] },
    questions: {
      document_type: {
        type: 'choice',
        instructions: 'Which type of document is `document`? `excerpt_note` says whether it is the whole document or an excerpt of it.',
        criteria: Object.fromEntries(types.map(t => [t.code, `${t.label}: ${t.definition}`])),
      },
    },
  };
}

const isProbability = v => typeof v === 'number' && v >= 0 && v <= 1;

/**
 * Reads the answer out of a response body.
 * @returns {{ type: string, label: string, confidence: number,
 *             ranked: { code: string, label: string, probability: number }[],
 *             inputTokens: number, model: string }}
 */
export function parseResponse(body, request) {
  const answer = body?.answers?.document_type;
  const tokens = body?.usage?.input_tokens;
  const options = Object.keys(request.questions.document_type.criteria);
  if (!answer || typeof answer.choice !== 'string' || !options.includes(answer.choice) ||
      !isProbability(answer.confidence) || typeof answer.probabilities !== 'object' ||
      !Number.isInteger(tokens) || tokens < 0)
    throw new JevError('invalid_output', 'Unexpected response from Jev');
  const ranked = Object.entries(answer.probabilities)
    .filter(([code, p]) => options.includes(code) && isProbability(p))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, probability]) => ({ code, label: labelFor(code), probability }));
  return { type: answer.choice, label: labelFor(answer.choice), confidence: answer.confidence,
           ranked, inputTokens: tokens, model: typeof body.model === 'string' ? body.model : request.model };
}

function errorFor(status, headers) {
  const retryAfter = Number(headers.get('retry-after')) || undefined;
  if (status === 401) return new JevError('auth', 'Jev rejected the API key', { status });
  if (status === 403) return new JevError('auth', 'This API key may not use Jev', { status });
  if (status === 429) return new JevError('rate_limited', 'Too many requests to Jev', { status, retryAfter });
  if (status === 400 || status === 413 || status === 422) return new JevError(status === 413 ? 'too_long' : 'bad_request', 'Jev could not take this request', { status });
  return new JevError('unavailable', 'Jev is unavailable', { status, retryAfter });
}

/**
 * Classifies one excerpt. One attempt, no retries: the caller decides whether to try again.
 * @param {import('./excerpt.js').Excerpt} ex
 * @param {{ apiKey: string, baseUrl?: string, model?: string, timeoutMs?: number, fetch?: typeof fetch }} opts
 */
export async function classify(ex, { apiKey, baseUrl = DEFAULT_BASE_URL, model = DEFAULT_MODEL, timeoutMs = 15000, fetch: f = fetch } = {}) {
  if (!apiKey) throw new JevError('config', 'No TypeSafe API key');
  const request = buildRequest(ex, { model });
  const started = performance.now();
  let res;
  try {
    res = await f(`${baseUrl.replace(/\/$/, '')}/v1/systemone`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw e?.name === 'TimeoutError' ? new JevError('timeout', 'Jev took too long') : new JevError('unavailable', 'Could not reach Jev');
  }
  if (!res.ok) throw errorFor(res.status, res.headers);
  let body;
  try { body = await res.json(); } catch { throw new JevError('invalid_output', 'Unexpected response from Jev'); }
  const latencyMs = Math.round(performance.now() - started);
  const result = parseResponse(body, request);
  return { ...result, latencyMs, costUsd: result.inputTokens * JEV_PRICE_PER_MTOK / 1e6,
           requestId: res.headers.get('x-typesafe-request-id') ?? undefined };
}

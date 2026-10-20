// The decoder-only baselines: the same excerpt and the same vocabulary, asked of a general-purpose
// LLM with its answer constrained to one type code (structured output with a JSON schema
// enum, for both vendors). Used only by the benchmark.
import { ALL_TYPES } from '../src/vocabulary.js';
import { EXCERPT_NOTES } from '../src/excerpt.js';

const CODES = ALL_TYPES.map(t => t.code);
const INSTRUCTIONS = [
  'Classify the document into exactly one of these document types. Answer with its code.',
  '',
  ...ALL_TYPES.map(t => `- ${t.code}: ${t.label}. ${t.definition}`),
].join('\n');
const userText = ex => `${EXCERPT_NOTES[ex.strategy]}\n\n<document>\n${ex.text}\n</document>`;

/** List prices in US dollars per million tokens (input, output), October 2026, from each vendor's pricing page. */
export const PRICES = {
  'claude-opus-5-5': [4, 20],
  'claude-haiku-5-5': [0.10, 0.50],
  'gpt-5.5': [5, 30],
  'gpt-5.4-mini': [0.75, 4.50],
};

async function post(url, headers, body) {
  const started = performance.now();
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return { json, latencyMs: Math.round(performance.now() - started) };
}

export async function classifyWithClaude(ex, model) {
  const { json, latencyMs } = await post('https://api.anthropic.com/v1/messages',
    { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    { model, max_tokens: 4000, system: INSTRUCTIONS,
      output_config: { format: { type: 'json_schema', schema: { type: 'object', properties: { type: { type: 'string', enum: CODES } }, required: ['type'], additionalProperties: false } } },
      messages: [{ role: 'user', content: userText(ex) }] });
  const text = json.content.find(c => c.type === 'text')?.text;
  let type = 'unparsed';
  try { type = JSON.parse(text).type; } catch {}
  return { type, latencyMs, inputTokens: json.usage.input_tokens, outputTokens: json.usage.output_tokens };
}

export async function classifyWithGpt(ex, model) {
  const { json, latencyMs } = await post('https://api.openai.com/v1/responses',
    { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    { model, instructions: INSTRUCTIONS, input: userText(ex), reasoning: { effort: 'low' },
      text: { format: { type: 'json_schema', name: 'document_type', strict: true,
        schema: { type: 'object', properties: { type: { type: 'string', enum: CODES } }, required: ['type'], additionalProperties: false } } } });
  const text = json.output?.flatMap(o => o.content ?? []).find(c => c.type === 'output_text')?.text;
  let type = 'unparsed';
  try { type = JSON.parse(text).type; } catch {}
  return { type, latencyMs, inputTokens: json.usage.input_tokens, outputTokens: json.usage.output_tokens };
}

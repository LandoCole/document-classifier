// The bi-encoder baseline: zero-shot classification by embedding similarity. Each type's label and
// definition is embedded once; the document is embedded in ~200-word chunks (the model reads at most
// 256 tokens at a time), the chunks are averaged, and the nearest type wins. Runs locally with
// transformers.js; used only by the benchmark.
import { ALL_TYPES } from '../src/vocabulary.js';

export const BIENCODER_MODEL = 'Xenova/all-MiniLM-L6-v2';

let embed, typeVectors;

const normalize = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

async function load() {
  if (embed) return;
  const { pipeline } = await import('@huggingface/transformers');
  embed = await pipeline('feature-extraction', BIENCODER_MODEL, { dtype: 'fp32' });
  const out = await embed(ALL_TYPES.map(t => `${t.label}: ${t.definition}`), { pooling: 'mean', normalize: true });
  typeVectors = out.tolist();
}

export async function classifyWithBiencoder(ex) {
  await load();
  const started = performance.now();
  const words = ex.text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += 200) chunks.push(words.slice(i, i + 200).join(' '));
  const vecs = (await embed(chunks, { pooling: 'mean', normalize: true })).tolist();
  const doc = normalize(vecs[0].map((_, j) => vecs.reduce((s, v) => s + v[j], 0)));
  const scores = typeVectors.map((v, i) => [ALL_TYPES[i].code, dot(doc, v)]).sort((a, b) => b[1] - a[1]);
  return { type: scores[0][0], latencyMs: Math.round(performance.now() - started), inputTokens: 0, outputTokens: 0 };
}

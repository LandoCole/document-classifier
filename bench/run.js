// The benchmark: every sample document through every method, scored against its label.
//   npm run bench                 all methods (needs .env with TYPESAFE_API_KEY, .env.bench with OPENAI_API_KEY and ANTHROPIC_API_KEY)
//   npm run bench -- jev keywords only these methods
// Answers are cached in bench/cache/ (git-ignored), so a rerun only calls what's new. Writes bench/results.json.
// Calls run one at a time so latencies aren't distorted by each other.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { excerpt } from '../src/excerpt.js';
import { classify, JEV_PRICE_PER_MTOK } from '../src/jev.js';
import { classifyByKeywords } from '../src/keywords.js';
import { classifyWithClaude, classifyWithGpt, PRICES } from './llm.js';

const root = fileURLToPath(new URL('..', import.meta.url));
for (const f of ['.env', '.env.bench'])
  if (existsSync(join(root, f)))
    for (const line of readFileSync(join(root, f), 'utf8').split('\n')) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }

const llm = (fn, model) => ex => fn(ex, model);
const price = ([inp, out]) => r => (r.inputTokens * inp + r.outputTokens * out) / 1e6;

/** Each method: how it's described in the results, and how it classifies one excerpt. */
const METHODS = [
  { id: 'jev', name: 'Jev', kind: 'Decision model', run: async ex => {
      const r = await classify(ex, { apiKey: process.env.TYPESAFE_API_KEY, baseUrl: process.env.TYPESAFE_BASE_URL, timeoutMs: 30000 });
      return { type: r.type, latencyMs: r.latencyMs, inputTokens: r.inputTokens, outputTokens: 0, model: r.model, confidence: r.confidence };
    }, cost: r => r.inputTokens * JEV_PRICE_PER_MTOK / 1e6 },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', kind: 'Decoder-only LLM', run: llm(classifyWithClaude, 'claude-opus-5-5'), cost: price(PRICES['claude-opus-5-5']) },
  { id: 'gpt-5.5', name: 'GPT-5.5', kind: 'Decoder-only LLM', run: llm(classifyWithGpt, 'gpt-5.5'), cost: price(PRICES['gpt-5.5']) },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', kind: 'Decoder-only LLM', run: llm(classifyWithClaude, 'claude-haiku-5-5'), cost: price(PRICES['claude-haiku-5-5']) },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', kind: 'Decoder-only LLM', run: llm(classifyWithGpt, 'gpt-5.4-mini'), cost: price(PRICES['gpt-5.4-mini']) },
  { id: 'minilm', name: 'MiniLM bi-encoder', kind: 'Bi-encoder', run: async ex => (await import('./biencoder.js')).classifyWithBiencoder(ex), cost: () => 0 },
  { id: 'keywords', name: 'Keyword rules', kind: 'Rules', run: async ex => {
      const started = performance.now();
      const { type } = classifyByKeywords(ex.text);
      return { type, latencyMs: Math.round((performance.now() - started) * 100) / 100, inputTokens: 0, outputTokens: 0 };
    }, cost: () => 0 },
];

function parseSample(src) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(src);
  if (!m) throw new Error('sample has no front matter');
  const meta = Object.fromEntries(m[1].split('\n').map(l => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  return { ...meta, text: m[2] };
}

const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

const only = process.argv.slice(2);
const files = (await readdir(join(root, 'samples'))).filter(f => f.endsWith('.md')).sort();
const docs = await Promise.all(files.map(async file => ({ file, ...parseSample(await readFile(join(root, 'samples', file), 'utf8')) })));
const previous = existsSync(join(root, 'bench/results.json')) ? JSON.parse(readFileSync(join(root, 'bench/results.json'), 'utf8')) : null;

const methods = [];
for (const m of METHODS) {
  if (only.length && !only.includes(m.id)) {
    const kept = previous?.methods.find(p => p.id === m.id);
    if (kept) methods.push(kept);
    continue;
  }
  const dir = join(root, 'bench/cache', m.id);
  await mkdir(dir, { recursive: true });
  const rows = [];
  for (const d of docs) {
    const cacheFile = join(dir, d.file.replace(/\.md$/, '.json'));
    let r = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : null;
    if (!r) {
      try { r = await m.run(excerpt(d.text)); }
      catch (e) { console.error(`${m.id} ${d.file}: ${e.message}`); continue; }
      await writeFile(cacheFile, JSON.stringify(r));
    }
    rows.push({ file: d.file, label: d.type, ...r, costUsd: m.cost(r) });
    process.stdout.write(r.type === d.type ? '.' : 'x');
  }
  if (!rows.length) { console.log(` ${m.name}: no results`); continue; }
  const correct = rows.filter(r => r.type === r.label).length;
  const sum = k => rows.reduce((s, r) => s + r[k], 0);
  methods.push({
    id: m.id, name: m.name, kind: m.kind, model: rows.find(r => r.model)?.model ?? m.id,
    n: rows.length, correct, accuracy: correct / rows.length,
    medianLatencyMs: quantile(rows.map(r => r.latencyMs), 0.5), p90LatencyMs: quantile(rows.map(r => r.latencyMs), 0.9),
    meanInputTokens: Math.round(sum('inputTokens') / rows.length), meanOutputTokens: Math.round(sum('outputTokens') / rows.length),
    costPerThousandDocs: 1000 * sum('costUsd') / rows.length,
    misses: rows.filter(r => r.type !== r.label).map(r => ({ file: r.file, label: r.label, predicted: r.type })),
  });
  console.log(` ${m.name}: ${correct}/${rows.length}`);
}

const results = { date: new Date().toISOString().slice(0, 10), documents: docs.length, methods };
await writeFile(join(root, 'bench/results.json'), JSON.stringify(results, null, 2) + '\n');

const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
console.log('\n| Method | Kind | Accuracy | Median latency | Input tokens / doc | Cost / 1,000 docs |\n|---|---|---|---|---|---|');
for (const m of methods)
  console.log(`| ${m.name} | ${m.kind} | ${m.correct}/${m.n} (${fmt(100 * m.accuracy)}%) | ${m.medianLatencyMs < 10 ? '<10' : fmt(m.medianLatencyMs)} ms | ${m.meanInputTokens ? fmt(m.meanInputTokens) : '–'} | $${fmt(m.costPerThousandDocs, 2)} |`);

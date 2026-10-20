// Token-budgeted excerpts: what of a document to send to the model.
//
// A document type usually shows in its opening, its section headings and its closing, so a long
// document doesn't need to be sent whole. Short documents go whole; long ones are cut to an outline
// (opening, every heading with its first sentence, closing) or, without enough headings, to the
// opening and closing alone. Plain JavaScript, no dependencies; runs in the browser and in Node.

export const LIMITS = {
  maxTokens: 20000,          // send the whole document up to this size
  splitHalfTokens: 10000,    // a split excerpt keeps this many tokens from each end
  edgeWords: 500,            // an outline keeps this many words from each end
  minHeadings: 3,            // fewer headings than this and an outline isn't worth it
  headingSentenceWords: 40,  // most words kept under each heading
  scannedCharsPerPage: 40,   // fewer characters per page than this and the PDF is probably scanned
};

/** About four characters per token for English text; close enough to budget with. */
export const approxTokens = text => Math.ceil(text.length / 4);

const HEADING = /^#{1,6}\s+\S/;
const SPLIT_MARK = '\n\n[…]\n\n';

const words = s => s.split(/\s+/).filter(Boolean);

/** Character offset just after the first `n` words of `s`. */
function afterWords(s, n) {
  const re = /\S+/g;
  let m, count = 0, end = 0;
  while (count < n && (m = re.exec(s)) !== null) { end = m.index + m[0].length; count++; }
  return end;
}

/** Character offset where the last `n` words of `s` begin. */
function beforeLastWords(s, n) {
  const starts = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(s)) !== null) starts.push(m.index);
  return starts.length <= n ? 0 : starts[starts.length - n];
}

function firstSentence(text, maxWords) {
  const clipped = words(text).slice(0, maxWords).join(' ');
  const m = /^(.+?[.!?])(\s|$)/.exec(clipped);
  return m ? m[1] : clipped;
}

/** The opening, every heading in between with the first sentence under it, and the closing. */
function outline(md) {
  const { edgeWords, headingSentenceWords } = LIMITS;
  const headEnd = afterWords(md, edgeWords), tailStart = beforeLastWords(md, edgeWords);
  const parts = [md.slice(0, headEnd).trim()];
  const lines = md.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], start = offset;
    offset += line.length + 1;
    if (!HEADING.test(line.trim()) || start < headEnd || start >= tailStart) continue;
    const body = [];
    for (let j = i + 1; j < lines.length && body.length < headingSentenceWords; j++) {
      const next = lines[j].trim();
      if (HEADING.test(next)) break;
      if (!next) { if (body.length) break; continue; }
      body.push(...words(next));
    }
    const sentence = firstSentence(body.join(' '), headingSentenceWords);
    parts.push(sentence ? `${line.trim()}\n${sentence}` : line.trim());
  }
  parts.push(md.slice(tailStart).trim());
  return parts.filter(Boolean).join('\n\n');
}

/** The opening and closing `splitHalfTokens` of the document. */
function split(md) {
  const n = LIMITS.splitHalfTokens * 4;
  return `${md.slice(0, n)}${SPLIT_MARK}${md.slice(-n)}`;
}

/**
 * @typedef {'whole' | 'outline' | 'split'} Strategy
 * @typedef {{ text: string, strategy: Strategy, tokens: number, totalTokens: number,
 *             pages: number, headings: number }} Excerpt
 */

/**
 * Cuts a document's text (markdown headings with `#`) to fit the token budget.
 * @param {string} text
 * @param {number} [pages=1]
 * @returns {Excerpt}
 */
export function excerpt(text, pages = 1) {
  const md = text.replace(/\r\n?/g, '\n').trim();
  const totalTokens = approxTokens(md);
  const headings = md.split('\n').filter(l => HEADING.test(l.trim())).length;
  const make = (body, strategy) => ({ text: body, strategy, tokens: approxTokens(body), totalTokens, pages, headings });
  if (totalTokens <= LIMITS.maxTokens) return make(md, 'whole');
  if (headings >= LIMITS.minHeadings) {
    const body = outline(md);
    if (approxTokens(body) <= LIMITS.maxTokens) return make(body, 'outline');
  }
  return make(split(md), 'split');
}

/** What the model is told about the excerpt it's reading. */
export const EXCERPT_NOTES = {
  whole: 'This is the whole document.',
  outline: 'This is an excerpt of a longer document: its opening text, every section heading with the first sentence under it, and its closing text.',
  split: 'This is an excerpt of a longer document: its opening and closing sections only.',
};

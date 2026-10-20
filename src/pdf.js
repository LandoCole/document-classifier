// PDF → text in the browser, with pdf.js from jsDelivr. The file never leaves the visitor's machine:
// only the excerpt cut from this text is sent to classify.
//
// Lines are rebuilt from pdf.js text items by their position, and lines set noticeably larger than
// the body text are marked as `##` headings, so the excerpt can outline long documents.
import { LIMITS } from './excerpt.js';

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
let pdfjs;

async function load() {
  if (pdfjs) return pdfjs;
  pdfjs = await import(`${PDFJS}pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
  return pdfjs;
}

/** One page's text items grouped into lines, top to bottom, with each line's largest font size. */
function linesOf(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = it.transform[5], size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 0;
    let row = rows.find(r => Math.abs(r.y - y) < Math.max(2, size * 0.4));
    if (!row) rows.push(row = { y, size: 0, parts: [] });
    row.parts.push({ x: it.transform[4], s: it.str });
    row.size = Math.max(row.size, size);
  }
  return rows.sort((a, b) => b.y - a.y).map(r => ({
    size: r.size,
    text: r.parts.sort((a, b) => a.x - b.x).map(p => p.s).join(' ').replace(/\s+/g, ' ').trim(),
  }));
}

/**
 * Reads a PDF's text.
 * @param {ArrayBuffer} bytes
 * @returns {Promise<{ kind: 'ok', text: string, pages: number } | { kind: 'scanned', pages: number } | { kind: 'unreadable', reason: string }>}
 */
export async function pdfToText(bytes, { maxPages = 400 } = {}) {
  try {
    const lib = await load();
    const doc = await lib.getDocument({ data: bytes, isEvalSupported: false }).promise;
    const pages = [];
    for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
      const page = await doc.getPage(i);
      pages.push(linesOf((await page.getTextContent()).items));
    }
    const sizes = pages.flat().map(l => l.size).filter(Boolean).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)] || 0;
    const text = pages.map(lines => lines.map(l =>
      body && l.size >= body * 1.25 && l.text.split(' ').length <= 14 ? `## ${l.text}` : l.text).join('\n')).join('\n\n');
    const chars = text.replace(/\s/g, '').length;
    if (chars / doc.numPages < LIMITS.scannedCharsPerPage) return { kind: 'scanned', pages: doc.numPages };
    return { kind: 'ok', text, pages: doc.numPages };
  } catch (e) {
    return { kind: 'unreadable', reason: e?.name === 'PasswordException' ? 'This PDF is password-protected.' : 'This PDF could not be read.' };
  }
}

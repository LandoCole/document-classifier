// The flicker and settle of the type chips. While Jev is thinking the highlight wanders over every
// type at random; once the answer is in, it replays the answer's real probabilities, hopping between
// the likely types and slowing down until it lands on the choice. The motion is decoration, but the
// settle only ever visits types in proportion to how likely Jev found them.

/** Random type codes for the waiting phase, never the same twice in a row. */
export function wander(codes, rng = Math.random) {
  let last = null;
  return () => {
    let c;
    do c = codes[Math.floor(rng() * codes.length)]; while (codes.length > 1 && c === last);
    return (last = c);
  };
}

/**
 * The hops of the settle: early hops sample a flattened version of the distribution, later ones
 * sharpen towards it, and the last is always the choice. Delays grow so it visibly slows.
 * @param {{ code: string, probability: number }[]} ranked
 * @param {string} choice
 * @returns {{ code: string, delay: number }[]}
 */
export function settle(ranked, choice, { hops = 9, rng = Math.random } = {}) {
  const top = ranked.slice(0, 6);
  const out = [];
  for (let i = 0; i < hops - 1; i++) {
    const sharp = 0.35 + 0.65 * (i / (hops - 1));          // flattening exponent: 0.35 → 1
    const w = top.map(t => Math.max(t.probability, 1e-4) ** sharp);
    let r = rng() * w.reduce((a, b) => a + b, 0), k = 0;
    while (k < w.length - 1 && (r -= w[k]) > 0) k++;
    out.push({ code: top[k].code, delay: Math.round(70 + 210 * (i / (hops - 1)) ** 2) });
  }
  out.push({ code: choice, delay: 320 });
  return out;
}

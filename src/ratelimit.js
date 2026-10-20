// A small per-key rate limiter for the public demo: so many requests a minute and a day per visitor.
// In memory, so on a serverless host each instance counts on its own. It's a speed bump against
// casual abuse, not a hard cap: set a spend limit on the API key too.

/**
 * @param {{ perMinute: number, perDay: number, now?: () => number, maxKeys?: number }} opts
 * @returns {(key: string) => number} records a hit and returns 0, or returns the seconds to wait (not recorded)
 */
export function rateLimiter({ perMinute, perDay, now = Date.now, maxKeys = 50000 }) {
  const minute = new Map(), day = new Map();   // key -> recent hit times; key -> [day number, count]
  return key => {
    const t = now(), today = Math.floor(t / 86400000);
    const hits = (minute.get(key) || []).filter(h => t - h < 60000);
    const [d, used] = day.get(key) || [today, 0];
    const count = d === today ? used : 0;
    if (count >= perDay) return Math.ceil(((today + 1) * 86400000 - t) / 1000);
    if (hits.length >= perMinute) return Math.max(1, Math.ceil((60000 - (t - hits[0])) / 1000));
    hits.push(t);
    minute.set(key, hits);
    day.set(key, [today, count + 1]);
    if (minute.size > maxKeys) for (const [k, v] of minute) if (t - v[v.length - 1] >= 60000) minute.delete(k);
    if (day.size > maxKeys) for (const [k, v] of day) if (v[0] !== today) day.delete(k);
    return 0;
  };
}

/** The visitor's address from the proxy header (Vercel puts the client first), with IPv6 cut to its /64. */
export function clientKey(forwardedFor) {
  const ip = (forwardedFor || '').split(',')[0].trim() || 'unknown';
  return ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip;
}

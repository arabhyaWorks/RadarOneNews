/**
 * Lightweight in-memory TTL cache for public API calls.
 * Avoids redundant network round-trips when the same data is needed
 * multiple times in a session (e.g. navigating back to the home page).
 */

const _store = new Map();

function _get(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }
  return entry.value;
}

function _set(key, value, ttlMs) {
  _store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidate(prefix) {
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) _store.delete(key);
  }
}

/**
 * Drop-in replacement for `axios.get(url, config)`.
 * Returns cached data immediately on a hit; otherwise fetches, caches, and returns.
 *
 * @param {import('axios').default} axios - axios instance to use
 * @param {string} url
 * @param {object} [config] - axios request config (params, headers, etc.)
 * @param {number} [ttlMs=60000] - cache lifetime in milliseconds
 */
export async function cachedGet(axios, url, config = {}, ttlMs = 60_000) {
  const key = url + (config.params ? JSON.stringify(config.params) : '');
  const cached = _get(key);
  if (cached !== null) return { data: cached, fromCache: true };

  const res = await axios.get(url, config);
  _set(key, res.data, ttlMs);
  return res;
}

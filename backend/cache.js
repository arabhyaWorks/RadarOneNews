/**
 * Simple in-process TTL cache.
 * Avoids repeated round-trips to remote RDS for public read endpoints.
 */
class TTLCache {
  constructor() {
    this._store = new Map();
  }

  set(key, value, ttlMs) {
    this._store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  del(key) {
    this._store.delete(key);
  }

  /** Delete all keys that start with a given prefix */
  delByPrefix(prefix) {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) this._store.delete(key);
    }
  }
}

const TTL = {
  CATEGORIES:     10 * 60 * 1000, // 10 min — rarely changes
  PUBLIC_ARTICLES:      60 * 1000, // 60 s  — fresh enough for readers
  BREAKING_NEWS:        30 * 1000, // 30 s  — near-real-time
};

module.exports = { cache: new TTLCache(), TTL };

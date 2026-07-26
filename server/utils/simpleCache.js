/**
 * Minimal in-memory TTL cache. Used to avoid re-hitting the Claude API for identical RAG
 * reranking requests fired in quick succession (e.g. search-as-you-type debounce windows).
 */

export function createTtlCache(ttlMs = 60_000, maxEntries = 200) {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      if (store.size >= maxEntries) {
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
  };
}

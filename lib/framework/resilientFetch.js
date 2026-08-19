/**
 * Fetch wrapper with its own in-memory cache, since Next's built-in fetch
 * cache doesn't apply to POST requests (used by JustWatch) and rejects
 * responses over 2MB (the XMLTV feed). Also adds a hard timeout - plain
 * fetch() can hang until the OS-level socket timeout - and serves the last
 * good response on failure (rate limit, timeout, offline) instead of
 * failing outright, so flaky/traveling connections still see stale data.
 */
const cache = new Map(); // key -> { data, timestamp }

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_TTL_MS = 3600000; // 1 hour
const DEFAULT_STALE_MS = 24 * 3600000; // serve stale-on-error for up to 24h

export async function resilientFetch(key, url, options = {}, cacheOpts = {}) {
  const {
    ttlMs = DEFAULT_TTL_MS,
    staleMs = DEFAULT_STALE_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    parse = "json"
  } = cacheOpts;

  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });

    if (!response.ok) {
      const error = new Error(`Request failed with ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = parse === "text" ? await response.text() : await response.json();
    cache.set(key, { data, timestamp: now });
    return data;
  } catch (error) {
    if (cached && now - cached.timestamp < staleMs) {
      console.warn(`resilientFetch: serving stale cache for "${key}" after error: ${error.message}`);
      return cached.data;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Runs `worker` over `items` with at most `limit` in flight at once.
 * Keeps result order matching input order.
 */
export function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  const runnerCount = Math.max(1, Math.min(limit, items.length));
  return Promise.all(Array.from({ length: runnerCount }, run)).then(() => results);
}

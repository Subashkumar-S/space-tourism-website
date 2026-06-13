import { redis } from "../config/redis";

// Cache-aside: return the cached JSON if present, otherwise compute via `fetcher`,
// store it under `key` with a TTL, and return it. Cache failures never break the
// request — they just fall through to the source of truth.
export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    /* ignore cache read errors */
  }

  const fresh = await fetcher();

  try {
    await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
  } catch {
    /* ignore cache write errors */
  }
  return fresh;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys);
}

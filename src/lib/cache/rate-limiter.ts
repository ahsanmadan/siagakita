/**
 * Rate limiter sliding-window berbasis IP untuk endpoint publik SiagaKita.
 *
 * Modul ini server-only. Backend utama adalah Upstash Redis (dipakai hanya bila
 * UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN tersedia). Bila env kosong
 * atau Redis bermasalah, limiter fail-open ke sliding window in-memory supaya
 * kanal darurat tetap hidup di localhost/demo.
 */

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
  prefix: string;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
  backend: "redis" | "memory";
};

export const RATE_LIMITS = {
  publicWeather: { limit: 30, windowMs: 60_000, prefix: "rl:weather" },
  publicReport: { limit: 5, windowMs: 60_000, prefix: "rl:report" },
} as const satisfies Record<string, RateLimitConfig>;

const MEMORY_MAX_KEYS = 5_000;
const MEMORY_SWEEP_THRESHOLD = 4_000;

type MemoryEntry = {
  hits: number[];
  lastSeen: number;
};

type RateLimiterGlobal = {
  memoryBuckets?: Map<string, MemoryEntry>;
  redisWarned?: boolean;
};

const globalScope = globalThis as typeof globalThis & { __siagakitaRateLimiter?: RateLimiterGlobal };

function getGlobalState(): RateLimiterGlobal {
  globalScope.__siagakitaRateLimiter ??= {};
  return globalScope.__siagakitaRateLimiter;
}

function getMemoryBuckets(): Map<string, MemoryEntry> {
  const state = getGlobalState();
  state.memoryBuckets ??= new Map<string, MemoryEntry>();
  return state.memoryBuckets;
}

/**
 * Hash ringan (FNV-1a) supaya key limiter tidak menyimpan IP mentah.
 * Bukan hash kriptografis: tujuannya hanya menghindari PII pada key/log.
 */
function hashIdentifier(identifier: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < identifier.length; index += 1) {
    hash ^= identifier.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function buildKey(config: RateLimitConfig, identifier: string) {
  return `${config.prefix}:${hashIdentifier(identifier)}`;
}

/**
 * Identitas pemanggil diambil dari header proxy. Header ini bisa dipalsukan bila
 * aplikasi tidak berada di belakang proxy tepercaya, jadi di produksi limiter
 * mengandalkan proxy edge (Vercel/Nginx) yang menulis ulang x-forwarded-for.
 */
export function getClientIdentifier(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const candidate = forwardedFor?.split(",")[0] ?? headers.get("x-real-ip") ?? "";
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return "unknown";
  return normalized.slice(0, 64);
}

function getRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

function warnRedisOnce(error: unknown) {
  const state = getGlobalState();
  if (state.redisWarned) return;
  state.redisWarned = true;
  const reason = error instanceof Error ? error.message : "penyebab tidak diketahui";
  console.warn(`[rate-limiter] Upstash Redis gagal dipakai, fallback in-memory: ${reason}`);
}

function sweepMemoryBuckets(buckets: Map<string, MemoryEntry>, now: number, windowMs: number) {
  for (const [key, entry] of buckets) {
    if (entry.lastSeen <= now - windowMs) buckets.delete(key);
  }

  if (buckets.size <= MEMORY_MAX_KEYS) return;

  const staleFirst = [...buckets.entries()].sort((left, right) => left[1].lastSeen - right[1].lastSeen);
  const overflow = buckets.size - MEMORY_MAX_KEYS;
  for (let index = 0; index < overflow; index += 1) {
    buckets.delete(staleFirst[index][0]);
  }
}

function checkMemoryRateLimit(config: RateLimitConfig, key: string, now: number): RateLimitResult {
  const buckets = getMemoryBuckets();

  if (buckets.size >= MEMORY_SWEEP_THRESHOLD) {
    sweepMemoryBuckets(buckets, now, config.windowMs);
  }

  const windowStart = now - config.windowMs;
  const entry = buckets.get(key);
  const hits = (entry?.hits ?? []).filter((timestamp) => timestamp > windowStart);

  if (hits.length >= config.limit) {
    const oldest = hits[0];
    const resetAt = oldest + config.windowMs;
    buckets.set(key, { hits, lastSeen: now });
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      resetAt,
      backend: "memory",
    };
  }

  hits.push(now);
  buckets.set(key, { hits, lastSeen: now });

  return {
    allowed: true,
    limit: config.limit,
    remaining: Math.max(0, config.limit - hits.length),
    retryAfterSeconds: 0,
    resetAt: hits[0] + config.windowMs,
    backend: "memory",
  };
}

async function checkRedisRateLimit(
  config: RateLimitConfig,
  key: string,
  now: number,
): Promise<RateLimitResult | null> {
  const env = getRedisEnv();
  if (!env) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url: env.url, token: env.token });
    const windowStart = now - config.windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

    await redis.zremrangebyscore(key, 0, windowStart);
    await redis.zadd(key, { score: now, member });
    await redis.pexpire(key, config.windowMs);
    const total = await redis.zcard(key);

    if (total > config.limit) {
      await redis.zrem(key, member);
      const oldest = await redis.zrange<string[]>(key, 0, 0, { withScores: true });
      const oldestScore = Number(oldest?.[1] ?? now);
      const resetAt = (Number.isFinite(oldestScore) ? oldestScore : now) + config.windowMs;
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
        resetAt,
        backend: "redis",
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - total),
      retryAfterSeconds: 0,
      resetAt: now + config.windowMs,
      backend: "redis",
    };
  } catch (error) {
    warnRedisOnce(error);
    return null;
  }
}

export async function checkRateLimit(config: RateLimitConfig, identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = buildKey(config, identifier);
  const redisResult = await checkRedisRateLimit(config, key, now);
  if (redisResult) return redisResult;
  return checkMemoryRateLimit(config, key, now);
}

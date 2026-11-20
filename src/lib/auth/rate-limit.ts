import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitRequest = {
  key: string;
  limit: number;
  windowSeconds: number;
};

const inMemoryLimits = new Map<string, { count: number; resetAt: number }>();
const upstashLimits = new Map<string, Ratelimit>();
let warnedAboutMemoryLimiter = false;
let redis: Redis | undefined;

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function clientAddress(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}

export async function consumeRateLimits(requests: LimitRequest[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    if (!redis) redis = new Redis({ url, token });
    const redisClient = redis;
    const results = await Promise.all(requests.map(async ({ key, limit, windowSeconds }) => {
      const signature = `${limit}:${windowSeconds}`;
      let limiter = upstashLimits.get(signature);
      if (!limiter) {
        limiter = new Ratelimit({
          redis: redisClient,
          limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
          prefix: "spmb:rate-limit",
        });
        upstashLimits.set(signature, limiter);
      }
      const result = await limiter.limit(key);
      return result.success;
    }));
    return results.every(Boolean);
  }

  const reason = Boolean(url) !== Boolean(token)
    ? "Konfigurasi Upstash tidak lengkap."
    : "Upstash belum dikonfigurasi.";
  return consumeInMemoryRateLimits(requests, reason);
}

function consumeInMemoryRateLimits(requests: LimitRequest[], reason: string) {
  if (!warnedAboutMemoryLimiter) {
    console.warn(`${reason} Pembatasan percobaan memakai memori pada proses ini.`);
    warnedAboutMemoryLimiter = true;
  }
  const now = Date.now();
  if (inMemoryLimits.size > 10_000) {
    for (const [key, entry] of inMemoryLimits) {
      if (entry.resetAt <= now) inMemoryLimits.delete(key);
    }
  }
  return requests.map(({ key, limit, windowSeconds }) => {
    const current = inMemoryLimits.get(key);
    if (!current || current.resetAt <= now) {
      inMemoryLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  }).every(Boolean);
}

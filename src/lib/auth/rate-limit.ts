import "server-only";

/**
 * Simple in-memory fixed-window rate limiter for sensitive endpoints (login, register, sync,
 * guide). Per-instance only; use a shared store (e.g. Redis/Upstash) for multi-instance prod.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfterS: 0 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, retryAfterS: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfterS: 0 };
}

export function clientKey(req: Request, scope: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

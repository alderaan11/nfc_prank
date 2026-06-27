import { NextRequest, NextResponse } from "next/server";

type RateLimiter = {
  limit: (key: string) => Promise<{ success: boolean; remaining: number }>;
};

let limiter: RateLimiter | null = null;

async function getLimiter(): Promise<RateLimiter> {
  if (limiter) return limiter;

  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
    });
  } else {
    // In-memory fallback (single instance only — not for production multi-instance)
    const counts = new Map<string, { count: number; reset: number }>();
    limiter = {
      async limit(key: string) {
        const now = Date.now();
        const entry = counts.get(key);
        if (!entry || now > entry.reset) {
          counts.set(key, { count: 1, reset: now + 60_000 });
          return { success: true, remaining: 19 };
        }
        entry.count++;
        const remaining = Math.max(0, 20 - entry.count);
        return { success: entry.count <= 20, remaining };
      },
    };
  }

  return limiter;
}

export async function rateLimit(
  req: NextRequest,
  windowKey: string
): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await getLimiter();
  const { success, remaining } = await rl.limit(`${windowKey}:${ip}`);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  }
  return null;
}

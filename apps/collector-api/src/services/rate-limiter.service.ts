import { Redis } from "ioredis";
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({
  path: path.resolve(__dirname, "../../../.env"),
});

const RATE_LIMIT_WINDOW = 1000; // 1 second window
const RATE_LIMIT_MAX = 100; // 100 requests per second per API key

export class RateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async isAllowed(apiKey: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    const key = `ratelimit:${apiKey}`;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, 2);

    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    const allowed = count <= RATE_LIMIT_MAX;
    const remaining = Math.max(0, RATE_LIMIT_MAX - count);
    const resetAt = now + RATE_LIMIT_WINDOW;

    return { allowed, remaining, resetAt };
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export const rateLimiter = new RateLimiter();
import Redis from "ioredis";
import { env } from "./env";

// Shared ioredis client — backs sessions, seat holds, rate limiting, and cache-aside.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err));

export async function redisStatus(): Promise<"up" | "down"> {
  try {
    return (await redis.ping()) === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
}

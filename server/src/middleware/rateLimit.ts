import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "../config/redis";
import { HttpError } from "./error";

// Redis-backed limiter for auth routes: 10 attempts per minute per IP.
const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:auth",
  points: 10,
  duration: 60,
});

export async function authLimiter(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await authRateLimiter.consume(req.ip || "unknown");
    next();
  } catch {
    next(new HttpError(429, "Too many attempts. Please try again in a minute."));
  }
}

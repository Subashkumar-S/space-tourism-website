import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "../config/redis";
import { HttpError } from "./error";

// Build a Redis-backed per-IP limiter middleware.
function makeLimiter(
  keyPrefix: string,
  points: number,
  duration: number,
  message: string
) {
  const limiter = new RateLimiterRedis({ storeClient: redis, keyPrefix, points, duration });
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await limiter.consume(req.ip || "unknown");
      next();
    } catch {
      next(new HttpError(429, message));
    }
  };
}

export const authLimiter = makeLimiter(
  "rl:auth",
  10,
  60,
  "Too many attempts. Please try again in a minute."
);

export const bookingLimiter = makeLimiter(
  "rl:booking",
  20,
  60,
  "Too many booking attempts. Please slow down."
);

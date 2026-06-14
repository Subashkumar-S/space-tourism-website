import { Router } from "express";
import { mongoStatus } from "../config/db";
import { redisStatus } from "../config/redis";
import { env } from "../config/env";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const mongo = mongoStatus();
  const redis = await redisStatus();
  const ok = mongo === "up" && redis === "up";
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    mongo,
    redis,
    // Reflects what THIS running process read at boot — handy for checking whether
    // a restart actually picked up new .env keys.
    stripe: env.stripeEnabled ? "configured" : "not configured",
    google: env.googleEnabled ? "configured" : "not configured",
    uptime: process.uptime(),
  });
});

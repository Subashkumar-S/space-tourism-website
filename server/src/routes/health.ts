import { Router } from "express";
import { mongoStatus } from "../config/db";
import { redisStatus } from "../config/redis";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const mongo = mongoStatus();
  const redis = await redisStatus();
  const ok = mongo === "up" && redis === "up";
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    mongo,
    redis,
    uptime: process.uptime(),
  });
});

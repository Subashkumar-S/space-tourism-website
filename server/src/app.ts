import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import {
  sessionMiddleware,
  passportInit,
  passportSession,
} from "./middleware/session";
import { errorHandler, notFound } from "./middleware/error";
import { healthRouter } from "./routes/health";
import { destinationsRouter } from "./routes/destinations";
import { authRouter } from "./routes/auth";
import { bookingsRouter } from "./routes/bookings";
import { webhookRouter } from "./routes/webhook";
import { configurePassport } from "./config/passport";
import { env } from "./config/env";

export function createApp() {
  const app = express();

  // Trust the platform proxy in prod so secure cookies work behind it.
  if (env.isProd) {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(morgan(env.isProd ? "combined" : "dev"));
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  // Stripe webhook needs the raw body for signature verification — mount BEFORE json.
  app.use(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    webhookRouter
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  configurePassport();
  app.use(sessionMiddleware);
  app.use(passportInit);
  app.use(passportSession);

  app.use("/api/health", healthRouter);
  app.use("/api/destinations", destinationsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/bookings", bookingsRouter);
  // Feature routers mount here as milestones land:
  //   /api/admin (M4)

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

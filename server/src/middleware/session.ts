import session from "express-session";
import RedisStore from "connect-redis";
import passport from "passport";
import { RequestHandler } from "express";
import { redis } from "../config/redis";
import { env } from "../config/env";

const store = new RedisStore({
  client: redis,
  prefix: "space:sess:",
});

// Both local and Google auth (M2) resolve onto this single session.
export const sessionMiddleware: RequestHandler = session({
  store,
  secret: env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Cross-site cookies in prod (client and API on different origins).
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});

export const passportInit: RequestHandler = passport.initialize();
export const passportSession: RequestHandler = passport.session();

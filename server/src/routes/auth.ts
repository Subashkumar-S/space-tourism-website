import { Router } from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, toSessionUser, SessionUser } from "../models/User";
import { HttpError } from "../middleware/error";
import { authLimiter } from "../middleware/rateLimit";
import { env } from "../config/env";

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/signup
authRouter.post("/signup", authLimiter, async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid signup details");
    const { name, email, password } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new HttpError(409, "An account with that email already exists");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    req.login(toSessionUser(user), (err) => {
      if (err) return next(err);
      res.status(201).json({ user: toSessionUser(user) });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRouter.post("/login", authLimiter, (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return next(new HttpError(400, "Invalid login details"));

  passport.authenticate(
    "local",
    (err: unknown, user: SessionUser | false, info?: { message?: string }) => {
      if (err) return next(err);
      if (!user) {
        return next(new HttpError(401, info?.message || "Invalid email or password"));
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json({ user });
      });
    }
  )(req, res, next);
});

// POST /api/auth/logout
authRouter.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(204).end();
    });
  });
});

// GET /api/auth/me
authRouter.get("/me", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json({ user: req.user });
    return;
  }
  res.status(401).json({ error: "Not authenticated" });
});

// GET /api/auth/google  → kick off OAuth
authRouter.get("/google", (req, res, next) => {
  if (!env.googleEnabled) {
    return next(new HttpError(503, "Google sign-in is not configured"));
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// GET /api/auth/google/callback  → finish OAuth, redirect back to the client
authRouter.get(
  "/google/callback",
  (req, res, next) => {
    if (!env.googleEnabled) {
      return next(new HttpError(503, "Google sign-in is not configured"));
    }
    passport.authenticate("google", {
      failureRedirect: `${env.CLIENT_ORIGIN}/login?error=google`,
    })(req, res, next);
  },
  (_req, res) => {
    res.redirect(`${env.CLIENT_ORIGIN}/`);
  }
);

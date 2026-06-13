import { NextFunction, Request, Response } from "express";
import { HttpError } from "./error";

// NOTE: Real auth lands in M2 (Passport local + Google on a shared session). These
// guards are wired into the app now so routes can reference them; until strategies
// exist, `req.isAuthenticated()` is always false and protected routes return 401/403.

export function checkAuthenticated(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.isAuthenticated?.() && req.user) {
    next();
    return;
  }
  next(new HttpError(401, "Authentication required"));
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const user = req.user as { role?: string } | undefined;
  if (req.isAuthenticated?.() && user?.role === "admin") {
    next();
    return;
  }
  next(new HttpError(403, "Admin access required"));
}

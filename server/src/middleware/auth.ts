import { NextFunction, Request, Response } from "express";
import { HttpError } from "./error";

// Passport (local + Google) is wired in M2, so req.user is the SessionUser when
// authenticated. These guards protect bookings/My Trips and the admin panel.

export function checkAuthenticated(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.isAuthenticated() && req.user) {
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
  if (req.isAuthenticated() && req.user?.role === "admin") {
    next();
    return;
  }
  next(new HttpError(403, "Admin access required"));
}

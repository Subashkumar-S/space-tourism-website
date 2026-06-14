import type { SessionUser } from "../models/User";

// Passport stores the deserialized user on req.user. Type it as our SessionUser so
// route handlers and guards get `req.user.role` etc. without casts.
declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

export {};

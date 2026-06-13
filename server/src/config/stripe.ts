import Stripe from "stripe";
import { env } from "./env";

// Null when STRIPE_SECRET_KEY isn't set. The booking route returns 503 in that case,
// so the rest of the app runs fine without payment credentials.
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

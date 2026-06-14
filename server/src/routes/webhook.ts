import { Router } from "express";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import {
  confirmBookingBySession,
  expireBookingBySession,
  CheckoutSessionLike,
} from "../lib/bookingLifecycle";

export const webhookRouter = Router();

// Mounted with express.raw() (see app.ts), so req.body is the raw Buffer that Stripe
// signature verification requires. Handlers are idempotent — Stripe retries.
webhookRouter.post("/", async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: "Stripe webhook not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature as string,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await confirmBookingBySession(
          event.data.object as unknown as CheckoutSessionLike
        );
        break;
      case "checkout.session.expired":
        await expireBookingBySession(
          event.data.object as unknown as CheckoutSessionLike
        );
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).end();
  }
});

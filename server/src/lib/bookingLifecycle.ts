import { Booking } from "../models/Booking";
import { reserveSeats, releaseSeats } from "./seats";
import { redis } from "../config/redis";

// Minimal shape of the Stripe Checkout Session fields we actually read.
export interface CheckoutSessionLike {
  id: string;
  payment_intent?: string | { id: string } | null;
}

async function clearHold(bookingId: string): Promise<void> {
  try {
    await redis.del(`booking:pending:${bookingId}`);
  } catch {
    /* ignore */
  }
}

// checkout.session.completed → confirm. Idempotent: re-confirming is a no-op.
export async function confirmBookingBySession(
  session: CheckoutSessionLike
): Promise<void> {
  const booking = await Booking.findOne({ stripeSessionId: session.id });
  if (!booking) return;
  if (booking.status === "confirmed" || booking.status === "refunded") return;

  if (booking.status === "cancelled") {
    // A sweeper/expiry already released the seats; re-acquire before confirming so we
    // never confirm a paid booking we can't seat.
    const reserved = await reserveSeats(String(booking.launch), booking.seats);
    if (!reserved) {
      console.warn(`overbook avoided: booking ${booking._id} paid but no seats left`);
      return;
    }
  }

  booking.status = "confirmed";
  booking.confirmedAt = new Date();
  if (typeof session.payment_intent === "string") {
    booking.stripePaymentIntentId = session.payment_intent;
  }
  await booking.save();
  await clearHold(booking._id.toString());
}

// checkout.session.expired → cancel a still-pending booking and restore its seats.
export async function expireBookingBySession(
  session: CheckoutSessionLike
): Promise<void> {
  const booking = await Booking.findOne({ stripeSessionId: session.id });
  if (!booking || booking.status !== "pending") return;

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  await booking.save();
  await releaseSeats(String(booking.launch), booking.seats);
  await clearHold(booking._id.toString());
}

// Periodic backstop: release seats for pending bookings whose hold has lapsed.
// A grace window lets Stripe's completed/expired webhooks win the race first.
export async function sweepExpiredBookings(): Promise<number> {
  const graceMs = 2 * 60 * 1000;
  const expired = await Booking.find({
    status: "pending",
    expiresAt: { $lt: new Date(Date.now() - graceMs) },
  });

  for (const booking of expired) {
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();
    await releaseSeats(String(booking.launch), booking.seats);
    await clearHold(booking._id.toString());
  }
  return expired.length;
}

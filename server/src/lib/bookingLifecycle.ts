import { Booking } from "../models/Booking";
import { reserveSeats, releaseSeats, invalidateLaunchCache } from "./seats";
import { redis } from "../config/redis";
import { stripe } from "../config/stripe";
import { sendBookingConfirmation } from "./email";

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

async function emailConfirmation(booking: InstanceType<typeof Booking>): Promise<void> {
  try {
    const populated = (await Booking.findById(booking._id)
      .populate("user", "name email")
      .populate({ path: "launch", populate: { path: "destination", select: "name" } })
      .lean()) as any;
    if (!populated?.user?.email) return;
    await sendBookingConfirmation({
      to: populated.user.email,
      name: populated.user.name,
      destination: populated.launch?.destination?.name || "your destination",
      departAt: populated.launch?.departAt,
      seats: populated.seats,
      amount: populated.amount,
    });
  } catch (err) {
    console.error("Confirmation email failed:", err);
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
    // A sweeper/expiry already released the seats; re-acquire before confirming.
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
  await emailConfirmation(booking);
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
  await invalidateLaunchCache(String(booking.launch));
  await clearHold(booking._id.toString());
}

// Periodic backstop: release seats for pending bookings whose hold has lapsed.
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
    await invalidateLaunchCache(String(booking.launch));
    await clearHold(booking._id.toString());
  }
  return expired.length;
}

// User cancel / admin refund: refund a confirmed booking (or cancel a pending one),
// restore its seats, and expire any open checkout session. Idempotent.
export async function cancelOrRefundBooking(
  booking: InstanceType<typeof Booking>
): Promise<InstanceType<typeof Booking>> {
  if (booking.status === "cancelled" || booking.status === "refunded") return booking;

  if (booking.status === "confirmed") {
    if (stripe && booking.stripePaymentIntentId) {
      await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
    }
    booking.status = "refunded";
  } else {
    // pending: expire the open checkout session so it can't still be paid
    if (stripe && booking.stripeSessionId) {
      try {
        await stripe.checkout.sessions.expire(booking.stripeSessionId);
      } catch {
        /* already closed/expired */
      }
    }
    booking.status = "cancelled";
  }

  booking.cancelledAt = new Date();
  await booking.save();
  await releaseSeats(String(booking.launch), booking.seats);
  await invalidateLaunchCache(String(booking.launch));
  await clearHold(booking._id.toString());
  return booking;
}

import { Router } from "express";
import { z } from "zod";
import { checkAuthenticated } from "../middleware/auth";
import { bookingLimiter } from "../middleware/rateLimit";
import { HttpError } from "../middleware/error";
import { Launch } from "../models/Launch";
import { Booking } from "../models/Booking";
import { reserveSeats, releaseSeats } from "../lib/seats";
import { stripe } from "../config/stripe";
import { redis } from "../config/redis";
import { env } from "../config/env";

export const bookingsRouter = Router();

const createSchema = z.object({
  launchId: z.string().min(1),
  passengers: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
});

// POST /api/bookings — atomically reserve seats, create a pending booking, and open
// a Stripe Checkout Session. Seats are held the moment checkout starts.
bookingsRouter.post("/", checkAuthenticated, bookingLimiter, async (req, res, next) => {
  let heldLaunchId: string | null = null;
  let seatsHeld = 0;
  let booking: InstanceType<typeof Booking> | null = null;

  try {
    if (!stripe) throw new HttpError(503, "Payments are not configured");

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid booking details");
    const { launchId, passengers } = parsed.data;
    const seats = passengers.length;

    const launch = await Launch.findById(launchId).populate("destination");
    if (!launch) throw new HttpError(404, "Launch not found");

    const reserved = await reserveSeats(launch._id, seats);
    if (!reserved) throw new HttpError(409, "Not enough seats available");
    heldLaunchId = String(reserved._id);
    seatsHeld = seats;

    const amount = reserved.pricePerSeat * seats;
    const expiresAt = new Date(Date.now() + env.BOOKING_HOLD_MINUTES * 60 * 1000);

    booking = new Booking({
      user: req.user!.id,
      launch: reserved._id,
      seats,
      passengers,
      amount,
      currency: "usd",
      status: "pending",
      expiresAt,
    });
    await booking.save();

    const destName = (launch.destination as { name?: string })?.name || "Space trip";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: seats,
          price_data: {
            currency: "usd",
            unit_amount: reserved.pricePerSeat,
            product_data: {
              name: `${destName} — seat`,
              description: `Departs ${new Date(reserved.departAt).toUTCString()}`,
            },
          },
        },
      ],
      success_url: `${env.CLIENT_ORIGIN}/my-trips?status=success`,
      cancel_url: `${env.CLIENT_ORIGIN}/my-trips?status=cancelled`,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      client_reference_id: String(booking._id),
      metadata: { bookingId: String(booking._id) },
    });

    booking.stripeSessionId = session.id;
    await booking.save();
    try {
      await redis.set(
        `booking:pending:${booking._id}`,
        "1",
        "EX",
        env.BOOKING_HOLD_MINUTES * 60
      );
    } catch {
      /* hold marker is best-effort; the sweeper is the real backstop */
    }

    res.status(201).json({ url: session.url, bookingId: booking._id });
  } catch (err) {
    // Roll back the hold so a failed checkout never leaks inventory.
    if (heldLaunchId && seatsHeld) {
      await releaseSeats(heldLaunchId, seatsHeld).catch(() => undefined);
    }
    if (booking && booking.status === "pending") {
      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      await booking.save().catch(() => undefined);
    }
    next(err);
  }
});

// GET /api/bookings/me — the signed-in user's trips (My Trips).
bookingsRouter.get("/me", checkAuthenticated, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user!.id })
      .populate({ path: "launch", populate: { path: "destination" } })
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      bookings.map((b: any) => {
        const launch = b.launch;
        return {
          id: b._id,
          status: b.status,
          seats: b.seats,
          passengers: b.passengers,
          amount: b.amount,
          currency: b.currency,
          createdAt: b.createdAt,
          launch: launch
            ? { id: launch._id, departAt: launch.departAt, durationLabel: launch.durationLabel }
            : null,
          destination: launch?.destination
            ? {
                slug: launch.destination.slug,
                name: launch.destination.name,
                imageKey: launch.destination.imageKey,
              }
            : null,
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

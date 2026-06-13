import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { Destination } from "../models/Destination";
import { Launch } from "../models/Launch";
import { Booking } from "../models/Booking";
import { cancelOrRefundBooking } from "../lib/bookingLifecycle";
import { invalidate } from "../lib/cache";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// ── Destinations ──────────────────────────────────────────────────────────────
adminRouter.get("/destinations", async (_req, res, next) => {
  try {
    res.json(await Destination.find().sort({ pricePerSeat: 1 }).lean());
  } catch (err) {
    next(err);
  }
});

const destinationPatch = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    pricePerSeat: z.number().int().min(0).optional(),
    imageKey: z.string().min(1).optional(),
  })
  .strict();

adminRouter.patch("/destinations/:id", async (req, res, next) => {
  try {
    const parsed = destinationPatch.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid destination fields");
    const dest = await Destination.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!dest) throw new HttpError(404, "Destination not found");
    await invalidate("cache:destinations:list");
    res.json(dest);
  } catch (err) {
    next(err);
  }
});

// ── Launches ──────────────────────────────────────────────────────────────────
adminRouter.get("/launches", async (_req, res, next) => {
  try {
    res.json(await Launch.find().populate("destination").sort({ departAt: 1 }).lean());
  } catch (err) {
    next(err);
  }
});

const launchCreate = z.object({
  destination: z.string().min(1), // destination _id
  departAt: z.string().min(1), // ISO date
  durationLabel: z.string().min(1),
  pricePerSeat: z.number().int().min(0),
  seatsTotal: z.number().int().min(1),
});

adminRouter.post("/launches", async (req, res, next) => {
  try {
    const parsed = launchCreate.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid launch fields");
    const dest = await Destination.findById(parsed.data.destination);
    if (!dest) throw new HttpError(400, "Destination not found");
    const launch = await Launch.create({
      destination: dest._id,
      departAt: new Date(parsed.data.departAt),
      durationLabel: parsed.data.durationLabel,
      pricePerSeat: parsed.data.pricePerSeat,
      seatsTotal: parsed.data.seatsTotal,
      seatsAvailable: parsed.data.seatsTotal,
      status: "scheduled",
    });
    await invalidate(`cache:launches:${dest.slug}`);
    res.status(201).json(launch);
  } catch (err) {
    next(err);
  }
});

const launchPatch = z
  .object({
    departAt: z.string().optional(),
    durationLabel: z.string().min(1).optional(),
    pricePerSeat: z.number().int().min(0).optional(),
    seatsTotal: z.number().int().min(1).optional(),
    status: z.enum(["scheduled", "full", "departed", "cancelled"]).optional(),
  })
  .strict();

adminRouter.patch("/launches/:id", async (req, res, next) => {
  try {
    const parsed = launchPatch.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid launch fields");
    const launch = await Launch.findById(req.params.id);
    if (!launch) throw new HttpError(404, "Launch not found");
    const data = parsed.data;

    if (data.seatsTotal !== undefined) {
      const booked = launch.seatsTotal - launch.seatsAvailable;
      if (data.seatsTotal < booked) {
        throw new HttpError(409, `Cannot set capacity below ${booked} already-booked seats`);
      }
      launch.seatsAvailable = data.seatsTotal - booked;
      launch.seatsTotal = data.seatsTotal;
    }
    if (data.departAt !== undefined) launch.departAt = new Date(data.departAt);
    if (data.durationLabel !== undefined) launch.durationLabel = data.durationLabel;
    if (data.pricePerSeat !== undefined) launch.pricePerSeat = data.pricePerSeat;
    if (data.status !== undefined) launch.status = data.status;
    await launch.save();

    const dest = await Destination.findById(launch.destination).lean();
    if (dest) await invalidate(`cache:launches:${dest.slug}`);
    res.json(launch);
  } catch (err) {
    next(err);
  }
});

// DELETE = cancel a launch: refund/cancel its active bookings and restore seats.
adminRouter.delete("/launches/:id", async (req, res, next) => {
  try {
    const launch = await Launch.findById(req.params.id);
    if (!launch) throw new HttpError(404, "Launch not found");
    const affected = await Booking.find({
      launch: launch._id,
      status: { $in: ["pending", "confirmed"] },
    });
    for (const booking of affected) await cancelOrRefundBooking(booking);
    launch.status = "cancelled";
    await launch.save();
    const dest = await Destination.findById(launch.destination).lean();
    if (dest) await invalidate(`cache:launches:${dest.slug}`);
    res.json({ id: launch._id, status: "cancelled", affectedBookings: affected.length });
  } catch (err) {
    next(err);
  }
});

// ── Bookings ──────────────────────────────────────────────────────────────────
adminRouter.get("/bookings", async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {};
    const { status } = req.query;
    if (typeof status === "string" && status) filter.status = status;
    const bookings = await Booking.find(filter)
      .populate("user", "name email")
      .populate({ path: "launch", populate: { path: "destination", select: "name slug" } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/bookings/:id/refund", async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new HttpError(404, "Booking not found");
    await cancelOrRefundBooking(booking);
    res.json({ id: booking._id, status: booking.status });
  } catch (err) {
    next(err);
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────
adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [byStatus, popular] = await Promise.all([
      Booking.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, seats: { $sum: "$seats" }, amount: { $sum: "$amount" } } },
      ]),
      Booking.aggregate([
        { $match: { status: { $in: ["confirmed", "refunded"] } } },
        { $lookup: { from: "launches", localField: "launch", foreignField: "_id", as: "launch" } },
        { $unwind: "$launch" },
        { $lookup: { from: "destinations", localField: "launch.destination", foreignField: "_id", as: "destination" } },
        { $unwind: "$destination" },
        { $group: { _id: "$destination.name", bookings: { $sum: 1 }, seats: { $sum: "$seats" } } },
        { $sort: { bookings: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const statusMap: Record<string, { count: number; seats: number; amount: number }> = {};
    for (const row of byStatus) statusMap[row._id] = row;
    const confirmed = statusMap["confirmed"] || { count: 0, seats: 0, amount: 0 };
    const refunded = statusMap["refunded"] || { count: 0, seats: 0, amount: 0 };

    res.json({
      revenueCents: confirmed.amount,
      refundedCents: refunded.amount,
      netRevenueCents: confirmed.amount - refunded.amount,
      seatsSold: confirmed.seats,
      totalBookings: byStatus.reduce((sum, row) => sum + row.count, 0),
      bookingsByStatus: byStatus.map((row) => ({ status: row._id, count: row.count })),
      popularDestinations: popular.map((row) => ({ name: row._id, bookings: row.bookings, seats: row.seats })),
    });
  } catch (err) {
    next(err);
  }
});

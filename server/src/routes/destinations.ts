import { Router } from "express";
import { Destination } from "../models/Destination";
import { Launch } from "../models/Launch";
import { HttpError } from "../middleware/error";
import { cacheAside } from "../lib/cache";

export const destinationsRouter = Router();

const LIST_TTL = 60; // seconds
const LIST_KEY = "cache:destinations:list";
const launchesKey = (slug: string) => `cache:launches:${slug}`;

// GET /api/destinations — all destinations, cheapest first.
destinationsRouter.get("/", async (_req, res, next) => {
  try {
    const destinations = await cacheAside(LIST_KEY, LIST_TTL, () =>
      Destination.find().sort({ pricePerSeat: 1 }).lean()
    );
    res.json(destinations);
  } catch (err) {
    next(err);
  }
});

// GET /api/destinations/:slug — a single destination.
destinationsRouter.get("/:slug", async (req, res, next) => {
  try {
    const destination = await Destination.findOne({
      slug: req.params.slug.toLowerCase(),
    }).lean();
    if (!destination) throw new HttpError(404, "Destination not found");
    res.json(destination);
  } catch (err) {
    next(err);
  }
});

// GET /api/destinations/:slug/launches — upcoming, bookable launches only.
destinationsRouter.get("/:slug/launches", async (req, res, next) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const launches = await cacheAside(launchesKey(slug), LIST_TTL, async () => {
      const destination = await Destination.findOne({ slug }).lean();
      if (!destination) throw new HttpError(404, "Destination not found");
      return Launch.find({
        destination: destination._id,
        status: "scheduled",
        departAt: { $gt: new Date() },
        seatsAvailable: { $gt: 0 },
      })
        .sort({ departAt: 1 })
        .lean();
    });
    res.json(launches);
  } catch (err) {
    next(err);
  }
});

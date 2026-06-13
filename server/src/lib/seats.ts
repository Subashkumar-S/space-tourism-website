import { Types } from "mongoose";
import { Launch } from "../models/Launch";
import { invalidate } from "./cache";

// The centerpiece: an oversell-proof reservation. Decrement seats only if enough
// remain AND the launch is still scheduled, in ONE atomic operation. If two requests
// race for the last seats, exactly one matches the filter; the other gets null.
export function reserveSeats(launchId: Types.ObjectId | string, seats: number) {
  return Launch.findOneAndUpdate(
    { _id: launchId, seatsAvailable: { $gte: seats }, status: "scheduled" },
    { $inc: { seatsAvailable: -seats } },
    { new: true }
  );
}

// Give seats back (abandoned/expired/refunded bookings).
export function releaseSeats(launchId: Types.ObjectId | string, seats: number) {
  return Launch.findByIdAndUpdate(
    launchId,
    { $inc: { seatsAvailable: seats } },
    { new: true }
  );
}

// Drop the cached launches list for a launch's destination so seat counts stay fresh
// after a reserve/release.
export async function invalidateLaunchCache(
  launchId: Types.ObjectId | string
): Promise<void> {
  const launch = await Launch.findById(launchId).populate("destination", "slug").lean();
  const slug = (launch?.destination as { slug?: string } | undefined)?.slug;
  if (slug) await invalidate(`cache:launches:${slug}`);
}

import { Types } from "mongoose";
import { Launch } from "../models/Launch";

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

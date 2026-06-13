import mongoose from "mongoose";
import { env } from "../config/env";
import { Destination } from "../models/Destination";
import { Launch } from "../models/Launch";
import { reserveSeats } from "../lib/seats";

// Proves the centerpiece: fire N concurrent reservations at a 1-seat launch and
// assert exactly one wins and seatsAvailable lands at 0 (no oversell).
async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);

  const dest = await Destination.create({
    slug: `loadtest-${Date.now()}`,
    name: "LoadTest",
    description: "throwaway",
    distance: "0",
    travel: "0",
    pricePerSeat: 1000,
    imageKey: "moon",
  });
  const launch = await Launch.create({
    destination: dest._id,
    departAt: new Date(Date.now() + 86_400_000),
    durationLabel: "1 day",
    pricePerSeat: 1000,
    seatsTotal: 1,
    seatsAvailable: 1,
    status: "scheduled",
  });

  const N = 50;
  const outcomes = await Promise.all(
    Array.from({ length: N }, () =>
      reserveSeats(launch._id, 1)
        .then((r) => (r ? 1 : 0))
        .catch(() => 0)
    )
  );
  const winners = outcomes.reduce((a, b) => a + b, 0);
  const after = await Launch.findById(launch._id).lean();
  const seatsLeft = after?.seatsAvailable;

  console.log(`concurrent attempts: ${N}`);
  console.log(`winners (reservations that succeeded): ${winners}`);
  console.log(`seatsAvailable after: ${seatsLeft}`);

  const ok = winners === 1 && seatsLeft === 0;
  console.log(ok ? "PASS — exactly one reservation, no oversell" : "FAIL — oversell!");

  await Launch.deleteOne({ _id: launch._id });
  await Destination.deleteOne({ _id: dest._id });
  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("loadtest failed:", err);
  process.exit(1);
});

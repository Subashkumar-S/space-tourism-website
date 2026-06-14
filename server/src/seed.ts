import mongoose from "mongoose";
import { env } from "./config/env";
import { Destination } from "./models/Destination";
import { Launch } from "./models/Launch";

// Destinations lifted from client/src/Components/data.js, enriched with slug,
// imageKey, and pricePerSeat (USD integer cents).
const destinations = [
  {
    slug: "moon",
    name: "Moon",
    imageKey: "moon",
    description:
      "See our planet as you've never seen it before. A perfect relaxing trip away to help regain perspective and come back refreshed. While you're there, take in some history by visiting the Luna 2 and Apollo 11 landing sites.",
    distance: "384,400 km",
    travel: "3 days",
    pricePerSeat: 25_000_00, // $25,000.00
  },
  {
    slug: "mars",
    name: "Mars",
    imageKey: "mars",
    description:
      "Don't forget to pack your hiking boots. You'll need them to tackle Olympus Mons, the tallest planetary mountain in our solar system. It's two and a half times the size of Everest!",
    distance: "225 mil. km",
    travel: "9 months",
    pricePerSeat: 120_000_00, // $120,000.00
  },
  {
    slug: "europa",
    name: "Europa",
    imageKey: "europa",
    description:
      "The smallest of the four Galilean moons orbiting Jupiter, Europa is a winter lover's dream. With an icy surface, it's perfect for a bit of ice skating, curling, hockey, or simple relaxation in your snug wintery cabin.",
    distance: "628 mil. km",
    travel: "3 years",
    pricePerSeat: 250_000_00, // $250,000.00
  },
  {
    slug: "titan",
    name: "Titan",
    imageKey: "titan",
    description:
      "The only moon known to have a dense atmosphere other than Earth, Titan is a home away from home (just a few hundred degrees colder!). As a bonus, you get striking views of the Rings of Saturn.",
    distance: "1.6 bil. km",
    travel: "7 years",
    pricePerSeat: 480_000_00, // $480,000.00
  },
];

function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

async function seed(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected. Clearing destinations + launches…");
  await Promise.all([Destination.deleteMany({}), Launch.deleteMany({})]);

  const created = await Destination.insertMany(destinations);
  console.log(`Inserted ${created.length} destinations.`);

  // A few future launches per destination with varying capacity.
  const seatOptions = [12, 16, 20, 24];
  const dayOffsets = [30, 75, 135, 210];
  let launchCount = 0;

  for (const dest of created) {
    const launches = dayOffsets.map((offset, i) => {
      const seatsTotal = seatOptions[i % seatOptions.length];
      return {
        destination: dest._id,
        departAt: futureDate(offset),
        durationLabel: dest.travel,
        pricePerSeat: dest.pricePerSeat,
        seatsTotal,
        seatsAvailable: seatsTotal,
        status: "scheduled" as const,
      };
    });
    await Launch.insertMany(launches);
    launchCount += launches.length;
  }
  console.log(`Inserted ${launchCount} launches.`);

  await mongoose.disconnect();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

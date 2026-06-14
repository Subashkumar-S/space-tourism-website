import mongoose from "mongoose";
import { env } from "../config/env";
import { User } from "../models/User";

// Promote an existing user to admin by email.
//   npm run make-admin -- you@example.com
async function main(): Promise<void> {
  const email = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }

  await mongoose.connect(env.MONGODB_URI);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: "admin" },
    { new: true }
  );
  if (user) console.log(`✓ ${user.email} is now an admin`);
  else console.error(`✗ No user found with email ${email}`);

  await mongoose.disconnect();
  process.exit(user ? 0 : 1);
}

main().catch((err) => {
  console.error("make-admin failed:", err);
  process.exit(1);
});

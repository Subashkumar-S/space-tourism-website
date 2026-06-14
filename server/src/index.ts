import { createApp } from "./app";
import { connectMongo } from "./config/db";
import { redis } from "./config/redis";
import { env } from "./config/env";
import { startSweeper } from "./lib/sweeper";

async function main(): Promise<void> {
  await connectMongo();
  // ioredis connects automatically; ping to surface connection errors early.
  await redis.ping().catch(() => undefined);

  // Backstop that releases seats held by abandoned/expired pending bookings.
  startSweeper();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(
      `🚀 Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`
    );
    // Surface the resolved public URLs so they're easy to register externally.
    if (env.googleEnabled) {
      console.log(`   Google OAuth callback: ${env.GOOGLE_CALLBACK_URL}`);
    }
    if (env.stripeEnabled) {
      console.log(`   Stripe webhook endpoint: ${env.webhookUrl}`);
    }
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

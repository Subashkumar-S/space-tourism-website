import { createApp } from "./app";
import { connectMongo } from "./config/db";
import { redis } from "./config/redis";
import { env } from "./config/env";

async function main(): Promise<void> {
  await connectMongo();
  // ioredis connects automatically; ping to surface connection errors early.
  await redis.ping().catch(() => undefined);

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(
      `🚀 Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`
    );
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

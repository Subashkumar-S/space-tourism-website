import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Single env file for the whole project: the repo-root .env (three levels up from
// both server/src/config and server/dist/config). In Docker no such file exists —
// Compose injects the vars instead — so dotenv just no-ops on the miss.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// That root .env is SPACE_-prefixed so it never clashes with the sibling projects
// on a shared host. Alias each SPACE_FOO to the plain FOO the app reads. Blanks
// are skipped so the schema defaults below still apply, and an existing FOO (e.g.
// injected by Compose in Docker) is never overwritten.
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("SPACE_") && value && !process.env[key.slice(6)]) {
    process.env[key.slice(6)] = value;
  }
}

// Core configuration validated at boot. Provider keys (Stripe, Google, Resend) are
// added to this schema in their respective milestones (M2/M3/M4).
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  // Session signing secret — required, no default. Boot fails loudly if missing.
  SECRET: z.string().min(1, "SECRET is required"),
  // Default to localhost for native dev against deploy/docker-compose.dev.yml.
  // The full Docker stack and cloud/prod override these via environment.
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/space-tourism"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  CLIENT_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  // Google OAuth (optional). When both ID and secret are present the Google
  // strategy is registered; otherwise only local email/password auth is available.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default("http://localhost:5000/api/auth/google/callback"),
  // Stripe (test mode). When STRIPE_SECRET_KEY is set the booking pay flow is live;
  // otherwise POST /api/bookings returns 503 and the rest of the app still runs.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Minutes a pending booking holds its seats before the sweeper releases them.
  // Stripe Checkout sessions require >= 30 min expiry, so keep this >= 30.
  BOOKING_HOLD_MINUTES: z.coerce.number().min(30).default(30),
  // Email (optional). When RESEND_API_KEY is set, confirmation emails are sent.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Space Tourism <onboarding@resend.dev>"),
  // Comma-separated emails auto-promoted to admin on signup/login (bootstrap).
  ADMIN_EMAILS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  googleEnabled: Boolean(
    parsed.data.GOOGLE_CLIENT_ID && parsed.data.GOOGLE_CLIENT_SECRET
  ),
  stripeEnabled: Boolean(parsed.data.STRIPE_SECRET_KEY),
  emailEnabled: Boolean(parsed.data.RESEND_API_KEY),
  adminEmails: (parsed.data.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};

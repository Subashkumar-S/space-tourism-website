import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

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
};

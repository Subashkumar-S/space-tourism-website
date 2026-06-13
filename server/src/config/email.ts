import { Resend } from "resend";
import { env } from "./env";

// Null when RESEND_API_KEY isn't set — confirmation emails are then skipped, so the
// rest of the app runs without email credentials.
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

import { resend } from "../config/email";
import { env } from "../config/env";

export async function sendBookingConfirmation(params: {
  to: string;
  name: string;
  destination: string;
  departAt?: Date;
  seats: number;
  amount: number;
}): Promise<void> {
  if (!resend) return; // email not configured — skip silently

  const dollars = (params.amount / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  const departs = params.departAt ? new Date(params.departAt).toUTCString() : "TBA";

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      subject: `Your trip to ${params.destination} is confirmed`,
      html: `
        <h1>See you in space, ${params.name}!</h1>
        <p>Your booking to <strong>${params.destination}</strong> is confirmed.</p>
        <ul>
          <li><strong>Seats:</strong> ${params.seats}</li>
          <li><strong>Departs:</strong> ${departs}</li>
          <li><strong>Total paid:</strong> ${dollars}</li>
        </ul>
        <p>Bon voyage!</p>
      `,
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

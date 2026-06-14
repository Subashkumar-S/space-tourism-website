import { sweepExpiredBookings } from "./bookingLifecycle";

let timer: NodeJS.Timeout | null = null;

// Backstop for abandoned checkouts: periodically release seats held by pending
// bookings past their hold (Stripe's expired webhook handles most cases promptly).
export function startSweeper(intervalMs = 60_000): void {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      const released = await sweepExpiredBookings();
      if (released > 0) {
        console.log(`Sweeper released ${released} expired booking(s).`);
      }
    } catch (err) {
      console.error("Sweeper error:", err);
    }
  }, intervalMs);
  timer.unref?.();
}

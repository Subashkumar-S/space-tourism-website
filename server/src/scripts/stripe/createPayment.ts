import { env } from "../../config/env"; // loads the root .env + resolves public URLs
import Stripe from "stripe";

// Standalone Stripe test-payment helper. Reads STRIPE_SECRET_KEY from the repo-root
// .env fresh on every run (so it doubles as a check that your key works, independent
// of whether the API server has been restarted).
//
//   npm run stripe:pay                     # create 1 succeeded test payment
//   npm run stripe:pay -- --count 3        # create 3
//   npm run stripe:pay -- --amount 500000  # cents (default 2_500_000 = $25,000)
//   npm run stripe:pay -- --checkout       # instead create a hosted Checkout URL
//
// Test mode only — it refuses to run against a live key.

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      args[key] = next && !next.startsWith("--") ? (i++, next) : "true";
    }
  }
  return args;
}

function fmt(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("✗ STRIPE_SECRET_KEY is not set in server/.env");
    console.error("  Add a line:  STRIPE_SECRET_KEY=sk_test_...   then re-run.");
    process.exit(1);
  }
  if (!key.startsWith("sk_test_")) {
    console.error("✗ Refusing to run: STRIPE_SECRET_KEY is not a test key (sk_test_...).");
    process.exit(1);
  }

  // "new stripe package": default export, no apiVersion pin → uses the SDK's latest.
  const stripe = new Stripe(key);

  const args = parseArgs(process.argv.slice(2));
  const amount = Math.max(50, Number(args.amount || 2_500_000)); // cents
  const currency = (args.currency || "usd").toLowerCase();

  // --checkout: create a hosted Checkout Session (what the booking flow uses) and
  // print the URL so you can pay with the test card in a browser.
  if (args.checkout) {
    const clientOrigin = env.CLIENT_ORIGIN;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: { name: "Space tourism — test seat" },
          },
        },
      ],
      success_url: `${clientOrigin}/my-trips?status=success`,
      cancel_url: `${clientOrigin}/my-trips?status=cancelled`,
    });
    console.log(`✓ Checkout Session created: ${session.id}`);
    console.log(`  Pay (test card 4242 4242 4242 4242):\n  ${session.url}`);
    return;
  }

  // Default: create N confirmed PaymentIntents using Stripe's shared test card
  // payment method, so each shows up as a succeeded payment in the dashboard.
  const count = Math.max(1, Number(args.count || 1));
  console.log(`Creating ${count} succeeded test payment(s) of ${fmt(amount, currency)} each…\n`);

  for (let i = 1; i <= count; i++) {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: "pm_card_visa", // Stripe's test Visa payment method
      payment_method_types: ["card"],
      confirm: true,
      description: `Space tourism test payment #${i}`,
    });
    console.log(`  ${i}. ${intent.id}  ${intent.status}  ${fmt(intent.amount, currency)}`);
  }

  console.log("\n✓ Done. View them at https://dashboard.stripe.com/test/payments");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("✗ Stripe error:", message);
  process.exit(1);
});

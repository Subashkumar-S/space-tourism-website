import "../../config/env"; // loads the repo-root .env (SPACE_* aliased to plain names)
import Stripe from "stripe";

// Cleanup helper for the Stripe TEST account. Checkout Sessions built with inline
// price_data create ad-hoc products/prices that pile up — this archives prices,
// removes products, and can expire open sessions / cancel cancelable payments.
//
//   npm run stripe:cleanup                 # archive prices + remove products
//   npm run stripe:cleanup -- --dry        # preview counts, change nothing
//   npm run stripe:cleanup -- --all        # also expire open sessions + cancel open payments
//   npm run stripe:cleanup -- --sessions   # only expire open Checkout Sessions
//   npm run stripe:cleanup -- --payments   # only cancel cancelable PaymentIntents
//
// Notes: succeeded payments are immutable (cannot be deleted); prices can only be
// archived (active:false), not deleted; products with prices are archived. Test only.

function parseArgs(argv: string[]): Record<string, boolean> {
  const args: Record<string, boolean> = {};
  for (const token of argv) if (token.startsWith("--")) args[token.slice(2)] = true;
  return args;
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("✗ STRIPE_SECRET_KEY is not set in server/.env");
    process.exit(1);
  }
  if (!key.startsWith("sk_test_")) {
    console.error("✗ Refusing to run against a non-test key (sk_test_...).");
    process.exit(1);
  }
  return new Stripe(key);
}

type StripeClient = ReturnType<typeof getStripe>;

async function archivePrices(stripe: StripeClient, dry: boolean): Promise<number> {
  let n = 0;
  for await (const price of stripe.prices.list({ limit: 100, active: true })) {
    if (!dry) await stripe.prices.update(price.id, { active: false });
    n++;
  }
  return n;
}

async function removeProducts(
  stripe: StripeClient,
  dry: boolean
): Promise<{ deleted: number; archived: number }> {
  let deleted = 0;
  let archived = 0;
  for await (const product of stripe.products.list({ limit: 100, active: true })) {
    if (dry) {
      archived++;
      continue;
    }
    try {
      // Deletes only if the product has no prices; otherwise archive it.
      await stripe.products.del(product.id);
      deleted++;
    } catch {
      await stripe.products.update(product.id, { active: false });
      archived++;
    }
  }
  return { deleted, archived };
}

async function expireSessions(stripe: StripeClient, dry: boolean): Promise<number> {
  let n = 0;
  for await (const session of stripe.checkout.sessions.list({ limit: 100, status: "open" })) {
    if (!dry) await stripe.checkout.sessions.expire(session.id);
    n++;
  }
  return n;
}

async function cancelPayments(stripe: StripeClient, dry: boolean): Promise<number> {
  const cancelable = new Set([
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
    "requires_capture",
  ]);
  let n = 0;
  for await (const intent of stripe.paymentIntents.list({ limit: 100 })) {
    if (!cancelable.has(intent.status)) continue;
    if (!dry) {
      try {
        await stripe.paymentIntents.cancel(intent.id);
      } catch {
        continue;
      }
    }
    n++;
  }
  return n;
}

async function main(): Promise<void> {
  const stripe = getStripe();
  const args = parseArgs(process.argv.slice(2));
  const dry = !!args.dry;

  const explicit = args.prices || args.products || args.sessions || args.payments;
  const doPrices = args.all || args.prices || !explicit;
  const doProducts = args.all || args.products || !explicit;
  const doSessions = args.all || args.sessions;
  const doPayments = args.all || args.payments;

  console.log(dry ? "DRY RUN — nothing will be changed.\n" : "Cleaning up Stripe test data…\n");

  if (doSessions) console.log(`  open sessions expired:   ${await expireSessions(stripe, dry)}`);
  if (doPayments) console.log(`  open payments cancelled: ${await cancelPayments(stripe, dry)}`);
  if (doPrices) console.log(`  prices archived:         ${await archivePrices(stripe, dry)}`);
  if (doProducts) {
    const { deleted, archived } = await removeProducts(stripe, dry);
    console.log(`  products removed:        ${deleted} deleted, ${archived} archived`);
  }

  console.log(dry ? "\n(dry run — re-run without --dry to apply)" : "\n✓ Done.");
}

main().catch((err: unknown) => {
  console.error("✗ Stripe error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

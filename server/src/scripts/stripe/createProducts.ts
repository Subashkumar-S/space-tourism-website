import "../../config/env"; // loads the repo-root .env (SPACE_* aliased to plain names)
import Stripe from "stripe";

// Create Stripe products + one-time prices in the TEST account.
//
//   npm run stripe:products                              # the 4-destination catalog
//   npm run stripe:products -- --count 3                 # 3 generic test products
//   npm run stripe:products -- --count 3 --amount 500000 # cents each (default 2_500_000)
//
// Test mode only.

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

// Mirrors the destination seed prices (USD integer cents).
const CATALOG = [
  { name: "Moon trip", amount: 2_500_000 },
  { name: "Mars trip", amount: 12_000_000 },
  { name: "Europa trip", amount: 25_000_000 },
  { name: "Titan trip", amount: 48_000_000 },
];

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
    process.exit(1);
  }
  if (!key.startsWith("sk_test_")) {
    console.error("✗ Refusing to run against a non-test key (sk_test_...).");
    process.exit(1);
  }
  const stripe = new Stripe(key);

  const args = parseArgs(process.argv.slice(2));
  const currency = (args.currency || "usd").toLowerCase();

  const items = args.count
    ? Array.from({ length: Math.max(1, Number(args.count)) }, (_, i) => ({
        name: `Space Tourism Test Product ${i + 1}`,
        amount: Math.max(50, Number(args.amount || 2_500_000)),
      }))
    : CATALOG;

  console.log(`Creating ${items.length} product(s) with prices…\n`);
  for (const item of items) {
    const product = await stripe.products.create({ name: item.name });
    const price = await stripe.prices.create({
      product: product.id,
      currency,
      unit_amount: item.amount,
    });
    console.log(`  ${item.name.padEnd(28)} ${product.id}  ${price.id}  ${fmt(item.amount, currency)}`);
  }

  console.log("\n✓ Done. View at https://dashboard.stripe.com/test/products");
}

main().catch((err: unknown) => {
  console.error("✗ Stripe error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

# Space Tourism — Full-Stack Booking Platform

A real space-flight booking platform built on top of the
[Frontend Mentor "Space tourism" multipage UI](https://www.frontendmentor.io/challenges/space-tourism-multipage-website-gRWj1URZ3).
The original challenge was a static marketing site; this turns it into a working
product — accounts, scheduled launches with seat inventory, **Stripe Hosted Checkout
bookings that can't oversell**, refunds, and a full CRUD admin panel — while keeping
the original visual design.

> The original Frontend Mentor solution write-up lives in
> [`client/README.md`](client/README.md).

## Features

- **Dual auth** — email/password (bcrypt) and Google OAuth, sharing one Redis-backed
  session. Google accounts link to an existing email automatically.
- **Destinations & launches** — four destinations seeded from the original site, each
  with multiple scheduled future launches carrying their own capacity and price.
- **Oversell-proof bookings** — seats are reserved with a single atomic
  `findOneAndUpdate`, so concurrent buyers can never exceed capacity.
- **Stripe Hosted Checkout (test mode)** — pending booking → Checkout Session → a
  signature-verified, idempotent webhook confirms payment or releases the hold.
- **Holds & a sweeper** — unpaid bookings expire and return their seats to inventory.
- **Refunds** — owners cancel from *My Trips*; admins refund from the panel. Refunds
  restore seats and invalidate the cache.
- **Admin panel** — role-gated CRUD over destinations, launches, and bookings, plus a
  stats dashboard (revenue, seats sold, popular destinations).
- **Confirmation email** (optional, via Resend) on successful payment.

## Architecture

A monorepo with three top-level areas:

```
.
├── client/   # React 18 (CRA) + Tailwind + Framer Motion — the original UI, wired to the API
├── server/   # Express + TypeScript API: Mongo (Mongoose) + Redis (sessions, cache, rate limits)
└── deploy/   # docker-compose (dev infra + full stack) and Firebase Hosting config
```

**Stack:** Node/Express · TypeScript · MongoDB (Mongoose) · Redis (ioredis,
`connect-redis` sessions, cache-aside, rate limiting) · Passport (local + Google) ·
Stripe SDK · Resend · zod · helmet · Docker. Money is stored as **USD integer cents**.

### How overselling is prevented

A booking reserves seats and only succeeds if enough remain — in one atomic operation:

```ts
Launch.findOneAndUpdate(
  { _id, seatsAvailable: { $gte: seats }, status: "scheduled" },
  { $inc: { seatsAvailable: -seats } },
  { new: true }
);
```

If the document doesn't match (not enough seats), no booking is created → `409`. A
50-way concurrency test against a 1-seat launch yields exactly one winner.

## Local development

**Prerequisites:** Node 20+, Docker (for Mongo + Redis).

### 1. Start infrastructure (Mongo + Redis)

```bash
docker compose -f deploy/docker-compose.dev.yml up -d
```

### 2. Configure and run the API

```bash
cd server
cp .env.example .env
# Set SECRET (required). Generate one:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm install
npm run seed      # load destinations + future launches
npm run dev       # http://localhost:5000  (GET /api/health → { status: "ok" })
```

### 3. Run the client

```bash
cd client
cp .env.example .env   # REACT_APP_API_BASE_URL=http://localhost:5000/api
npm install
npm start              # http://localhost:3000
```

### Alternative: full Docker stack

Runs everything (Mongo, Redis, API, and the client behind nginx with an `/api` proxy):

```bash
docker compose -f deploy/docker-compose.yml up --build
```

## Becoming an admin

The admin panel (`/admin`) is gated by a `role` on the user document — server-side, not
just hidden in the UI. Two ways to get it:

- **Bootstrap by env:** set `ADMIN_EMAILS` (comma-separated) in `server/.env`. Any
  listed email is auto-promoted to `admin` on signup or login. Promote-only — removing
  an email never demotes an existing admin.
- **Promote an existing user:**
  ```bash
  cd server && npm run make-admin -- you@example.com
  ```

There are no pre-seeded demo credentials — create an account, then use one of the above.

## Stripe (test mode)

1. Put your **test** secret key in `server/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```
   Without it, the app runs but `POST /api/bookings` returns `503`.
2. Forward webhooks to the local server and copy the printed signing secret into
   `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```
3. Pay with the Stripe test card **`4242 4242 4242 4242`**, any future expiry, any CVC.

Helper scripts (all refuse non-`sk_test_` keys):

| Script | Purpose |
| --- | --- |
| `npm run stripe:pay` | Create a test PaymentIntent / Checkout Session |
| `npm run stripe:products` | Create test products + prices |
| `npm run stripe:cleanup` | Archive test prices/products (`--dry`, `--all`, …) |

## API reference

All routes are prefixed with `/api`. Auth uses the session cookie (`credentials: include`).

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | — | Service status (mongo, redis, stripe, google, uptime) |
| GET | `/destinations` | — | List destinations |
| GET | `/destinations/:slug` | — | One destination |
| GET | `/destinations/:slug/launches` | — | Future, bookable launches |
| POST | `/auth/signup` · `/auth/login` · `/auth/logout` | — | Local auth |
| GET | `/auth/me` | session | Current user |
| GET | `/auth/google` · `/auth/google/callback` | — | Google OAuth |
| POST | `/bookings` | user | Reserve seats → returns Stripe Checkout `url` |
| POST | `/bookings/:id/cancel` | owner | Cancel/refund + restore seats |
| GET | `/bookings/me` | user | My Trips |
| POST | `/webhooks/stripe` | signature | Stripe events (raw body) |
| GET/PATCH | `/admin/destinations` `/admin/destinations/:id` | admin | Manage destinations |
| GET/POST/PATCH/DELETE | `/admin/launches…` | admin | Manage launches |
| GET | `/admin/bookings` · POST `/admin/bookings/:id/refund` | admin | Bookings + refund |
| GET | `/admin/stats` | admin | Revenue, seats sold, popular destinations |

## Server scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Reset + seed destinations and launches |
| `npm run make-admin -- <email>` | Promote a user to admin |
| `npm run loadtest` | Concurrency oversell test |

## Configuration

See [`server/.env.example`](server/.env.example) for the full list. Highlights:

| Var | Required | Notes |
| --- | --- | --- |
| `SECRET` | ✅ | Session signing secret |
| `MONGODB_URI` / `REDIS_URL` | — | Default to localhost; override for cloud |
| `CLIENT_ORIGIN` | — | CORS origin (default `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Enables the booking flow |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Enables Google sign-in |
| `RESEND_API_KEY` / `EMAIL_FROM` | — | Enables confirmation email |
| `ADMIN_EMAILS` | — | Auto-promote these emails to admin |

## Deployment

The app is deployment-ready and configured entirely through environment variables:

- Cookies are `secure` + `sameSite: none` and `trust proxy` is enabled when
  `NODE_ENV=production`, so the client and API can live on different origins.
- The client targets the API via `REACT_APP_API_BASE_URL` at build time.

To ship: point `MONGODB_URI`/`REDIS_URL` at managed services (e.g. MongoDB Atlas +
Upstash), deploy the API container, register a production Stripe webhook and set its
signing secret, set `CLIENT_ORIGIN` to the deployed client URL, add the Google OAuth
production redirect URI, and host the client build (e.g. Firebase Hosting — config in
[`deploy/firebase.json`](deploy/firebase.json)). See [`TASKS.md`](TASKS.md) (M5) for
the checklist.

## Credits

UI from the [Frontend Mentor Space tourism challenge](https://www.frontendmentor.io/challenges/space-tourism-multipage-website-gRWj1URZ3).
Full-stack platform built per [`ROADMAP.md`](ROADMAP.md).

# Tech Stack & Architecture

Technical companion to [`README.md`](README.md). This document explains the technology
choices, the architecture, how to run the project locally, the API surface, and how to
ship it.

## Technology choices

Money is stored everywhere as **USD integer cents** to avoid floating-point rounding.

| Area | Choice | Why |
| --- | --- | --- |
| **API** | Node + Express + **TypeScript** | Small, explicit, well-understood HTTP layer; TypeScript catches contract mistakes across models, routes, and the Stripe/Mongoose payloads at compile time. |
| **Database** | **MongoDB** (Mongoose) | Documents map naturally to destinations, launches, bookings (with embedded passengers); Mongoose gives schema validation and a clean place for the atomic seat operation. |
| **Cache / sessions / limits** | **Redis** (ioredis) | One dependency, three jobs: `connect-redis` session store (so logins survive restarts and scale horizontally), cache-aside for read-heavy catalog endpoints, and `rate-limiter-flexible` token buckets. |
| **Auth** | **Passport** (local + Google) | Battle-tested strategies; email/password (bcrypt) and Google OAuth resolve onto a single session, with account linking by verified email. |
| **Sessions over JWT** | server-side sessions | Sessions can be revoked instantly (logout, refund-triggered changes) and keep no auth state in the browser beyond an httpOnly cookie. |
| **Payments** | **Stripe Hosted Checkout** (test mode) | Stripe hosts the card form, so the app never touches card data (PCI scope stays minimal). A signed webhook is the source of truth for "paid". |
| **Email** | **Resend** | Simple API for transactional confirmation email; optional — the app runs without it. |
| **Validation** | **zod** | One schema validates request bodies and the environment at boot, failing fast on misconfiguration. |
| **Hardening** | **helmet**, CORS w/ credentials, rate limiting | Standard security headers, a single trusted client origin, and per-route abuse limits. |
| **Client** | React 18 (CRA) + Tailwind + Framer Motion | The original Frontend Mentor UI, kept intact and wired to the API. |
| **Containers** | Docker + docker-compose | Reproducible local infra and a portable production image. |

### Why bookings can't oversell

A booking reserves seats and only succeeds if enough remain — in **one atomic
operation**, so concurrent buyers can never exceed capacity:

```ts
Launch.findOneAndUpdate(
  { _id, seatsAvailable: { $gte: seats }, status: "scheduled" },
  { $inc: { seatsAvailable: -seats } },
  { new: true }
);
```

If the document doesn't match (not enough seats), no booking is created → `409`. A
50-way concurrency test against a 1-seat launch yields exactly one winner
(`npm run loadtest`).

### Payment lifecycle

1. `POST /api/bookings` atomically reserves seats, creates a `pending` booking with an
   `expiresAt` hold, and returns a Stripe Checkout URL.
2. Stripe hosts the payment. On success it fires `checkout.session.completed` to the
   webhook, which (idempotently, signature-verified) confirms the booking.
3. If the customer abandons checkout, `checkout.session.expired` releases the seats.
4. A background **sweeper** also releases any `pending` booking past its hold.
5. Cancel/refund restores seats and invalidates the affected cache entry.

## Architecture

A monorepo with three top-level areas:

```
.
├── client/   # React 18 (CRA) + Tailwind + Framer Motion — UI wired to the API
├── server/   # Express + TypeScript API: Mongo (Mongoose) + Redis
└── deploy/   # docker-compose (dev infra + full stack) and Firebase Hosting config
```

```
server/src/
├── index.ts            # entry: connect Mongo + Redis, then listen
├── app.ts              # express app: helmet · morgan · CORS · session · passport · routes
├── config/             # env (zod), db, redis, passport, stripe, email
├── middleware/         # session, auth (checkAuthenticated/requireAdmin), error, rateLimit
├── models/             # Destination, Launch, User, Booking
├── routes/             # destinations, auth, bookings, webhook, admin, health
├── lib/                # seats (atomic reserve), bookingLifecycle, sweeper, cache, email, adminRole
└── seed.ts             # reset + seed destinations and launches
```

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

The admin panel (`/admin`) is gated by a `role` on the user document — enforced
server-side, not just hidden in the UI. Two ways to get it:

- **Bootstrap by env:** set `ADMIN_EMAILS` (comma-separated) in `server/.env`. Any
  listed email is auto-promoted to `admin` on signup or login. Promote-only — removing
  an email never demotes an existing admin.
- **Promote an existing user:**
  ```bash
  cd server && npm run make-admin -- you@example.com
  ```

There are no pre-seeded credentials — create an account, then use one of the above.

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
| GET | `/bookings/me` | user | Your trips (all statuses) |
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

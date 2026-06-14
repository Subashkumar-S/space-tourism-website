# Implementation Tasks — Space Tourism Booking Platform

Microtask tracker for the conversion described in [`ROADMAP.md`](./ROADMAP.md).
Checked items are done. Milestones run **M0 → M5**; only **M0** is built so far.

**Repo layout (monorepo):** `client/` (CRA app) · `server/` (Express + TS API) ·
`deploy/` (docker-compose + Firebase config).

**Run it — local dev (recommended):** infra in Docker, app native, hot reload.
```bash
docker compose -f deploy/docker-compose.dev.yml up -d   # mongo + redis
cd server && npm install && npm run dev                 # API  → :5000
cd client && npm install && npm start                   # CRA  → :3000
```

**Run it — full stack in Docker:** everything containerized, app at `:3000`.
```bash
docker compose -f deploy/docker-compose.yml up --build   # mongo + redis + server + client
```
Both need `server/.env` (copy `server/.env.example`, set `SECRET`).

---

## M0 — Backend scaffold ✅

- [x] Restructure to monorepo: move CRA app into `client/`; move `firebase.json` +
      `.firebaserc` into `deploy/` (`public` → `../client/build`).
- [x] `server/` TypeScript project: `package.json` (`dev`/`build`/`start`/`typecheck`),
      `tsconfig.json` (CommonJS, strict).
- [x] `config/env.ts` — zod-validated env, fails fast on missing `SECRET`.
- [x] `config/db.ts` — Mongoose connect + `mongoStatus()`.
- [x] `config/redis.ts` — ioredis client + `redisStatus()`.
- [x] `middleware/session.ts` — `express-session` + `connect-redis` store; env-aware
      cookie; `passport.initialize()/session()` wired (strategies added in M2).
- [x] `middleware/error.ts` — `HttpError`, `notFound`, JSON error handler.
- [x] `middleware/auth.ts` — `checkAuthenticated` + `requireAdmin` (stubs until M2).
- [x] `routes/health.ts` — `GET /api/health` → `{ status, mongo, redis, uptime }`.
- [x] `app.ts` — helmet · morgan · CORS(credentials) · json · session · passport;
      raw-body carve-out comment reserved for the Stripe webhook (M3).
- [x] `index.ts` — connect Mongo + Redis, then listen.
- [x] Server `Dockerfile` (multi-stage: deps/dev/build/production) + `.dockerignore`.
- [x] Client `Dockerfile` (build → nginx) + `nginx.conf` reverse-proxying `/api`.
- [x] `deploy/docker-compose.yml` (full stack: mongo+redis+server+client) and
      `deploy/docker-compose.dev.yml` (infra-only for native client+server dev).
- [x] `server/.env.example`; root `.gitignore` (server/.env, dist, node_modules).
- [x] Verified end-to-end: health 200, 404 JSON, CORS credentials header.

## M1 — Data layer ✅

- [x] `models/Destination.ts` (slug, name, description, distance, travel,
      pricePerSeat¢, imageKey).
- [x] `models/Launch.ts` (destination ref, departAt, durationLabel, pricePerSeat¢,
      seatsTotal, seatsAvailable, status: scheduled|full|departed|cancelled).
- [x] `seed.ts` — lift the 4 destinations from `client/src/Components/data.js`;
      generate future launches with capacity + price; `npm run seed`.
- [x] Public reads: `GET /api/destinations`, `/api/destinations/:slug`,
      `/api/destinations/:slug/launches` (upcoming, non-full).
- [x] Redis **cache-aside** for destination/launch lists (short TTL).
- [x] Client: `src/api/client.js` (fetch wrapper, `credentials:"include"`,
      `REACT_APP_API_BASE_URL`); `imageKey → bundled asset` map.
- [x] Wire `client/src/Pages/Destination.js` to the API (drop `data.js`); keep Framer
      Motion + the `01` treatment; loading/error states.

## M2 — Auth (local + Google) ✅

- [x] `models/User.ts` (name, email unique, passwordHash optional, googleId sparse
      unique, role) + Express `User`/session type augmentation in `server/src/types/`.
- [x] Passport **local** strategy (bcryptjs) + **Google** strategy
      (`passport-google-oauth20`, callback `/api/auth/google/callback`) — Google
      registers only when `GOOGLE_CLIENT_ID/SECRET` are set.
- [x] **Account linking by email**: googleId → else email (attach googleId) → else
      create. `serialize/deserializeUser` store Mongo `_id`.
- [x] Auth routes: `POST /api/auth/signup|login|logout`, `GET /api/auth/me`,
      `GET /api/auth/google` + callback. Zod validation; rate-limit auth routes.
- [x] Replace the M0 stubs with real `checkAuthenticated` + `requireAdmin`.
- [x] Client: `AuthContext`, `/login` + `/signup` (+ "Continue with Google"),
      `ProtectedRoute`, navbar auth state. (returnTo mechanism ready; pending-booking
      resume gets exercised in M3.)

## M3 — Booking + Stripe (the centerpiece) ✅

- [x] `models/Booking.ts` (user, launch, seats, passengers[], amount¢, currency,
      status: pending|confirmed|cancelled|refunded, stripeSessionId,
      stripePaymentIntentId, expiresAt, createdAt/confirmedAt/cancelledAt).
- [x] `POST /api/bookings` — **atomic reserve** (`reserveSeats` in `lib/seats.ts`)
      → 409 if no match → pending booking (+expiresAt) → Stripe Checkout Session →
      return `url`. Rate-limited; rolls back the hold if checkout creation fails.
- [x] Redis `booking:pending:{id}` TTL key mirroring the hold.
- [x] `POST /api/webhooks/stripe` — **raw-body, signature-verified, idempotent**:
      `checkout.session.completed` → confirm + clear hold;
      `checkout.session.expired` → cancel + **restore seats**.
- [x] **Sweeper** — periodic job: `pending` past `expiresAt` → cancel + restore seats.
- [x] `GET /api/bookings/me` (My Trips).
- [x] Client: booking flow (`/book/:slug`, launch + passengers) → Stripe redirect →
      return handling; **My Trips** page. (Stripe opt-in via `STRIPE_SECRET_KEY`;
      oversell-proof reservation proven by `npm run loadtest`.)

## M4 — Refunds, admin, polish ✅

- [x] `POST /api/bookings/:id/cancel` — refund (if confirmed) or cancel (if pending,
      expiring the Stripe session) → restore seats. Shared `cancelOrRefundBooking`.
- [x] **Admin API** (`requireAdmin`): destinations `GET/PATCH`; launches
      `GET/POST/PATCH/DELETE` (capacity edits respect booked seats; DELETE cancels a
      launch + refunds its bookings); bookings `GET` + `POST /:id/refund`;
      `GET /api/admin/stats` (revenue, bookings, seats sold, popular destinations).
- [x] **Admin UI** (`/admin`, stats/destinations/launches/bookings tabs), admin-only
      route (`AdminRoute`); `npm run make-admin -- <email>` to promote a user.
- [x] Confirmation **email** on payment (Resend, opt-in); My Trips cancel button;
      launch-cache invalidation on seat changes; zod validation throughout.

## M5 — Ship

- [x] Prod config ready (platform-independent): cookie `secure + sameSite:none`,
      `trust proxy`, CORS `credentials:true` + `CLIENT_ORIGIN`, client reads
      `REACT_APP_API_BASE_URL`. `ADMIN_EMAILS` bootstrap for admin role.
- [x] README rewrite (architecture note + how-to-admin + test card `4242…`).
- [ ] Deploy API (host TBD) with **Atlas** + **Upstash** via env.
- [ ] Register prod **Stripe webhook** endpoint; copy signing secret to env.
- [ ] Client on Firebase Hosting; set `REACT_APP_API_BASE_URL` to deployed API.
- [ ] Google OAuth prod redirect URI.
- [ ] Portfolio entry update (ROADMAP §14).

---

## Appendix / later (Tier 2+)

- [ ] Waitlist when a launch is full; auto-offer a freed seat on cancellation.
- [ ] Vite + TS client migration.
- [ ] Booking PDF / ticket + launch calendar.
- [ ] Analytics dashboard (bridge to a ClickHouse-backed version).
- [ ] Playwright E2E: browse → pay → My Trips → refund.
- [ ] Concurrency load test: N bookings at a 1-seat launch → exactly one `confirmed`.

---

## Credentials needed per milestone

| At  | Variables |
| --- | --- |
| M0  | `SECRET` (set in `server/.env`) — Mongo/Redis come from Docker |
| M2  | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` |
| M3  | `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET` (from `stripe listen`) |
| M4  | `RESEND_API_KEY` (or SMTP_*) |
| M5  | Atlas `MONGODB_URI`, Upstash `REDIS_URL`, prod Stripe/Google secrets |

# Space Tourism → Full‑Stack Booking Platform — Roadmap

> **The move:** convert the static Frontend Mentor *space‑tourism* site into a real
> **space‑flight booking platform** — accounts (email/password **and** Google),
> scheduled launches with seat inventory, **Stripe‑paid** bookings that can't
> oversell, refunds, and a full admin panel — **without throwing away the UI.**
>
> The existing responsive design, Framer Motion transitions, and destination/crew/
> technology content all stay. We add a backend underneath them.

**Decisions locked for v1:** Node/Express + MongoDB + Redis · session auth with
**local + Google OAuth** · **Stripe Hosted Checkout** (test mode) as the headline
feature · cancel = **refund + restore seats** · **full CRUD admin panel** · USD,
money in integer cents.

---

## Table of contents

1. [Where it stands today](#1-where-it-stands-today)
2. [The conversion concept](#2-the-conversion-concept)
3. [Domain model](#3-domain-model)
4. [Core user flows](#4-core-user-flows)
5. [Feature list (v1)](#5-feature-list-v1)
6. [Stack](#6-stack)
7. [The centerpiece — paid booking that can't oversell](#7-the-centerpiece--paid-booking-that-cant-oversell)
8. [Authentication — local + Google on one session](#8-authentication--local--google-on-one-session)
9. [Admin panel (full CRUD)](#9-admin-panel-full-crud)
10. [Implementation plan (milestones)](#10-implementation-plan-milestones)
11. [Target architecture](#11-target-architecture)
12. [Local development & environment config](#12-local-development--environment-config)
13. [Deployment plan](#13-deployment-plan)
14. [Wire it into the portfolio](#14-wire-it-into-the-portfolio)
15. [Appendix — nice‑to‑haves](#15-appendix--nice-to-haves)

---

## 1. Where it stands today

| Aspect | Current state |
| --- | --- |
| Framework | Create React App (`react-scripts` 5), React 18 |
| Routing | React Router v6 — `/`, `/destination`, `/crew`, `/technology` |
| Styling | Tailwind 3 + Framer Motion page transitions |
| Data | **Static** — everything is hard‑coded in `src/Components/data.js` |
| Backend | None |
| Hosting | Firebase Hosting (`.firebaserc`, `firebase.json` already configured) |
| Interactivity | Navigation only; no state, no forms, no persistence |

**Keep:** the responsive layout, the Navbar `00/01/02/03` treatment, the Framer
Motion transitions, and all destination/crew/technology copy + assets.

**Add:** an API, a database, dual‑provider accounts, a paid booking flow, refunds,
and an admin panel.

---

## 2. The conversion concept

Reframe the four destinations (**Moon, Mars, Europa, Titan**) as **bookable trips**:

- Each destination keeps its `distance` and `travel` time, and gains a **price** and
  a set of scheduled **launches** (specific departure dates).
- Each launch has a **seat capacity** and tracks **seats remaining**.
- A visitor browses destinations (unchanged UI) → opens a destination → sees
  **available launches** → picks a date + seat count → **pays via Stripe** → lands on
  **My Trips** to view, and can **cancel for a refund** (seats are returned).
- An **admin** manages destinations, launches, and bookings through a full CRUD panel.

Why this is a strong portfolio piece:

- **Reuses** a genuinely nice front end instead of building UI from scratch.
- Real backend surface: **dual auth, payments, refunds, inventory, transactions,
  an admin role**.
- The headline — **a payment flow that can't oversell a launch even under concurrent
  checkouts** — is a systems story most portfolio apps can't tell.

---

## 3. Domain model

```
User                     Destination          Launch                       Booking
──────────────────       ─────────────        ──────────────────────       ──────────────────────────
_id                      _id                  _id                          _id
name                     slug (moon|mars|…)   destination → Destination    user    → User
email (unique)           name                 departAt (Date)              launch  → Launch
passwordHash (optional)  description          durationLabel ("3 days")     seats   (int ≥ 1)
googleId (opt, unique)   distance             pricePerSeat (cents)         passengers[] (names)
role (user|admin)        travel               seatsTotal (int)             amount  (cents)
createdAt                pricePerSeat         seatsAvailable (int) ◀────────currency ("usd")
                         imageKey             status (scheduled|full|       status (pending|confirmed|
                                                     departed|cancelled)            cancelled|refunded)
                                                                            stripeSessionId
                                                                            stripePaymentIntentId
                                                                            expiresAt (Date, pending)
                                                                            createdAt / confirmedAt /
                                                                            cancelledAt
```

**Redis (ephemeral):**
- `booking:pending:{bookingId}` — TTL key (~10 min) that mirrors a pending booking's
  hold, for prompt seat release if Stripe never confirms.
- session store (`connect-redis`), rate‑limit counters, and cache‑aside for
  destination/launch lists.

Notes:

- **Images stay client‑side.** The API returns `imageKey`/`slug` (e.g. `"moon"`);
  the React client maps it to the bundled asset in `src/assets/…`. No image hosting.
- `Destination` is **seed data** lifted out of `data.js`. `crew`/`technology` can stay
  static — they're not part of booking.
- `passwordHash` is **optional** (null for Google‑only accounts); `googleId` is a
  sparse unique index. Accounts are **linked by verified email** (see §8).
- Money is always **integer cents**, currency `usd`.

---

## 4. Core user flows

**Browse → pay → confirmed (happy path)**

1. `GET /api/destinations` → render the Destination page from the API.
2. Open a destination → `GET /api/destinations/:slug/launches` → upcoming launches
   with date, price, and seats remaining.
3. Pick a launch + seat count + passenger names → **Book** (login required).
4. `POST /api/bookings` → **atomically reserves seats**, creates a `pending` booking
   with `expiresAt`, and returns a **Stripe Checkout Session** URL.
5. Redirect to Stripe Hosted Checkout → user pays (test card).
6. Stripe → `POST /api/webhooks/stripe` `checkout.session.completed` → booking
   becomes **confirmed**; the hold is cleared.
7. Client returns to **My Trips** (`GET /api/bookings/me`) showing the confirmed trip.

**Abandoned / expired payment**

- Stripe `checkout.session.expired` (or our TTL sweeper) → if still `pending`, mark
  `cancelled` and **restore seats**. No orphaned holds.

**Cancel a confirmed booking → refund**

- `POST /api/bookings/:id/cancel` → `stripe.refunds.create({ payment_intent })` →
  mark `refunded` → **restore seats** to the launch.

**Admin** — full CRUD over destinations, launches, and bookings (see §9).

---

## 5. Feature list (v1)

Everything below is **in scope for v1** (we chose "full incl. payments").

- **Data layer:** destinations + launches in MongoDB; seed script; public read API;
  Destination page wired to the API.
- **Auth:** signup/login/logout with **email/password** *and* **Google OAuth**, on a
  shared session; account linking by email; `checkAuthenticated` + `requireAdmin`
  middleware (actually wired up — a lesson from the Entertainment app).
- **Booking + payments:** seat reservation, **Stripe Hosted Checkout**, webhook
  confirmation, pending‑expiry release, **My Trips**.
- **Cancellation:** Stripe **refund** + seat restoration.
- **Admin:** **full CRUD** panel for destinations, launches, and bookings + a stats
  view.
- **Hardening:** input validation, Redis **rate limiting** on booking/auth, friendly
  error states, confirmation **email** on successful payment.

**Later (Tier 2+, not v1):** waitlist when full, Vite/TS client migration, a
ClickHouse‑backed analytics dashboard (the bridge to your day‑job narrative).

---

## 6. Stack

| Layer | Choice | Reuse / notes |
| --- | --- | --- |
| Client | Keep **CRA** + React 18 + RR v6 + Tailwind + Framer Motion | Optional Vite/TS migration later |
| API | **Express + TypeScript** | Copy the Entertainment‑app server scaffolding |
| Auth | **Passport** (local + Google) + `express-session` + `connect-redis` | Sessions reused verbatim |
| DB | **MongoDB** (Mongoose) | Atlas in prod |
| Cache/holds | **Redis** (ioredis) | sessions, holds, rate‑limit, cache |
| Payments | **Stripe** Hosted Checkout + webhooks (test mode) | `stripe` Node SDK |
| Email | Resend (or Nodemailer/SMTP) | confirmation on payment |
| Infra | Docker Compose (mongo + redis + server) | same env conventions as Entertainment app |

---

## 7. The centerpiece — paid booking that can't oversell

This is the interview story: **a Stripe payment flow layered on atomic seat inventory.**

**The problem:** two users try to buy the last seats on a launch at the same time,
and payment takes time (the user is on Stripe's page). A naive flow oversells.

**The lifecycle:**

```
POST /bookings ─▶ atomically reserve seats ─▶ create pending booking (+expiresAt)
                                            ─▶ create Stripe Checkout Session ─▶ return url
        │
        ▼  user pays on Stripe
webhook checkout.session.completed ─▶ booking = confirmed, clear hold
        │
        ▼  user abandons / session expires
webhook checkout.session.expired (or TTL sweeper) ─▶ booking = cancelled, +seats restored
```

**Reserve atomically** — decrement only if enough seats remain, in one operation:

```ts
const launch = await Launch.findOneAndUpdate(
  { _id: launchId, seatsAvailable: { $gte: seats }, status: "scheduled" },
  { $inc: { seatsAvailable: -seats } },
  { new: true }
);
if (!launch) throw new HttpError(409, "Not enough seats available");
// create the pending booking + Stripe Checkout Session inside a transaction
```

If two requests race, exactly one matches the `$gte` filter; the other gets a clean
`409`. The seats are held the moment a checkout starts, so nobody can pay for a seat
that's mid‑purchase. Abandoned checkouts free their seats automatically via Stripe's
`checkout.session.expired` event, backed by a periodic sweeper over `pending`
bookings past `expiresAt`.

**Webhook safety:** verify the Stripe signature (`STRIPE_WEBHOOK_SECRET`) on a
**raw‑body** route, and make handlers **idempotent** (Stripe retries) — confirming an
already‑confirmed booking is a no‑op.

**Plus:** Redis **rate limiting** on `POST /api/bookings` and the auth routes, and
**cache‑aside** for destination/launch lists. A small **load test** (fire N concurrent
bookings at a 1‑seat launch, assert exactly one reaches `confirmed`) makes it a
demoable result, not just a claim.

---

## 8. Authentication — local + Google on one session

Both providers resolve to the **same session** (`express-session` + `connect-redis`);
Google is just a second Passport strategy, not a separate auth system.

- **Local strategy** — email + bcrypt `passwordHash`.
- **Google strategy** — `passport-google-oauth20`; callback at
  `/api/auth/google/callback`.
- **Account linking (by verified email):** on Google callback → find by `googleId`;
  else find by `email` and attach `googleId` to that user; else create a new user
  (`passwordHash` null).
- `serializeUser` / `deserializeUser` store the Mongo `_id` in the session.
- Middleware: `checkAuthenticated` (booking, My Trips) and `requireAdmin` (admin).
- **Cross‑site cookies in prod:** `cookie.sameSite="none"`, `secure=true`, and CORS
  `origin: CLIENT_ORIGIN, credentials: true`; client fetches with
  `credentials: "include"`.

UI: email/password forms **plus** a "Continue with Google" button; resume the pending
booking after login if the user was mid‑flow.

---

## 9. Admin panel (full CRUD)

Behind `requireAdmin`:

| Resource | Endpoints | UI |
| --- | --- | --- |
| Destinations | `GET/PATCH /api/admin/destinations[/:id]` | edit name, description, price, image key |
| Launches | `GET/POST/PATCH/DELETE /api/admin/launches[/:id]` | create/edit date, capacity, price, status; cancel a launch |
| Bookings | `GET /api/admin/bookings`, `POST /api/admin/bookings/:id/refund` | filter/search; refund + restore seats |
| Stats | `GET /api/admin/stats` | totals: revenue, bookings, seats sold, popular destinations |

Guard rails: editing a launch's capacity must respect already‑booked seats; canceling
a launch should refund + notify affected bookings (or block if confirmed bookings
exist, your call at build time).

---

## 10. Implementation plan (milestones)

### M0 — Backend scaffold
- [ ] Create `server/` (copy Entertainment‑app Express + TS + Mongoose + Passport +
      Redis session setup).
- [ ] Docker Compose: `mongo` + `redis` + `server`, env‑configurable URLs (local
      containers by default, cloud via env in prod).
- [ ] `.env.example`; `.gitignore` excludes `.env`; `.dockerignore` excludes secrets.

### M1 — Data layer
- [ ] `Destination` + `Launch` models; seed script (lift `data.js`, generate future
      launches with capacity + price).
- [ ] Public reads: `GET /api/destinations`, `/:slug`, `/:slug/launches`.
- [ ] Wire the React Destination page to the API; keep images via `imageKey`.

### M2 — Auth (local + Google)
- [ ] `User` model; local signup/login/logout (bcrypt, session).
- [ ] Google OAuth strategy + callback + **link‑by‑email**.
- [ ] `checkAuthenticated` + `requireAdmin` middleware, **wired up**.
- [ ] Login/Signup UI + "Continue with Google"; resume‑booking after login.

### M3 — Booking + Stripe (the core)
- [ ] `Booking` model; `POST /api/bookings` → **atomic reserve** + pending booking +
      Checkout Session.
- [ ] `POST /api/webhooks/stripe` (raw body, signature‑verified, idempotent):
      `checkout.session.completed` → confirm; `checkout.session.expired` → release.
- [ ] Pending‑expiry **sweeper** (periodic) as a backstop.
- [ ] Booking UI (seats + passengers) → Stripe redirect; **My Trips** page.

### M4 — Refunds, admin, polish
- [ ] Cancel (`POST /bookings/:id/cancel`) → **Stripe refund** + restore seats.
- [ ] **Full CRUD admin panel** (destinations / launches / bookings / stats).
- [ ] Confirmation **email** on payment; validation; rate limiting; error states.

### M5 — Ship
- [ ] Deploy API (Render / Railway / Fly) with **Atlas** + **Upstash** via env.
- [ ] Register the Stripe **webhook endpoint** (prod URL) in the Stripe dashboard.
- [ ] Client stays on **Firebase Hosting** (or Vercel); set `REACT_APP_API_BASE_URL`;
      CORS `credentials: true`.
- [ ] README rewrite (architecture note + **demo credentials** + test‑card note).
- [ ] Update the portfolio entry (§14).

---

## 11. Target architecture

```
                    ┌──────────────────────────────┐
   Browser ───────▶ │  React (CRA) — Firebase Host  │
                    │  Destinations · Booking · UI  │◀── redirect back from Stripe
                    └───────┬───────────────┬──────-┘
                            │ fetch          │ redirect to Checkout
                            │ (credentials)  ▼
                            │        ┌──────────────────┐
                            │        │  Stripe Checkout │
                            │        └────────┬─────────┘
                            ▼                 │ webhook (signed)
                    ┌──────────────────────────────┐
                    │  Express + TypeScript API     │◀───────────────┘
                    │  Passport (local + Google)    │
                    │  /destinations /launches      │
                    │  /bookings /webhooks /admin    │
                    └───────┬───────────────┬──────-┘
                            │               │
                  sessions, holds,      data, atomic
                  rate-limit, cache     seat reserve/restore
                            ▼               ▼
                    ┌────────────┐   ┌────────────────┐
                    │   Redis    │   │  MongoDB Atlas │
                    └────────────┘   └────────────────┘
```

---

## 12. Local development & environment config

Mirror the Entertainment‑app setup so both repos behave the same.

```bash
cp .env.example .env          # fill SECRET + Stripe + Google keys
docker compose up --build     # mongo + redis + server
npm start                     # CRA client (outside Docker)
stripe listen --forward-to localhost:5000/api/webhooks/stripe   # local webhooks
```

| Variable | Default (local) | Production |
| --- | --- | --- |
| `PORT` | `5000` | platform‑assigned |
| `MONGODB_URI` | `mongodb://mongo:27017/space-tourism` | Atlas URI |
| `REDIS_URL` | `redis://redis:6379` | Upstash URL |
| `SECRET` | *(required, no default)* | strong random |
| `CLIENT_ORIGIN` | `http://localhost:3000` | deployed client URL |
| `STRIPE_SECRET_KEY` | `sk_test_…` | `sk_test_…` (test mode) |
| `STRIPE_WEBHOOK_SECRET` | from `stripe listen` | from dashboard endpoint |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth test creds | same |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5000/api/auth/google/callback` | prod URL |
| `RESEND_API_KEY` *(or SMTP_…)* | test key | prod key |
| `REACT_APP_API_BASE_URL` *(client)* | `http://localhost:5000/api` | deployed API URL |

Leave `MONGODB_URI` / `REDIS_URL` unset locally to use the Docker containers; set them
to cloud URLs in production. **Never commit `.env`** — only `*.env.example` templates.
Stripe stays in **test mode** throughout (use test cards like `4242 4242 4242 4242`).

---

## 13. Deployment plan

| Piece | Where | Notes |
| --- | --- | --- |
| Client | **Firebase Hosting** (already set up) or Vercel | set `REACT_APP_API_BASE_URL` |
| API | Render / Railway / Fly | session cookie `SameSite=None; Secure` cross‑site |
| MongoDB | Atlas (free tier) | `MONGODB_URI` |
| Redis | Upstash (free tier) | `REDIS_URL` |
| Stripe webhook | Stripe dashboard → `/api/webhooks/stripe` | copy the signing secret to env |
| Google OAuth | Google Cloud console | add prod redirect URI |

Checklist: raw‑body route for the webhook (before JSON body parsing), CORS
`credentials: true`, cookie `secure + sameSite:"none"` in prod, client fetch with
`credentials: "include"`.

---

## 14. Wire it into the portfolio

Once deployed, update `next-portfolio/data/index.tsx` — the Space Tourism entry:

- Rewrite `des`, e.g. *"Full‑stack space‑flight booking platform — Node/Express API
  with Google + password auth and Stripe‑paid bookings that can't oversell a launch,
  behind a React + Tailwind UI."*
- Point `link` at the live booking app; keep the `github` link; consider adding a
  Stripe/payments icon to `iconLists`.
- Add **demo credentials** + the Stripe **test card** to the live site or README so
  reviewers can run the full pay flow without a real card.

---

## 15. Appendix — nice‑to‑haves

- **Waitlist** when a launch is full; auto‑offer a freed seat on cancellation.
- **Vite + TS migration** of the client to match the Entertainment app.
- **Booking PDF / “ticket”** + calendar view of launches.
- **Analytics dashboard** — bookings/revenue over time; the natural bridge to a
  ClickHouse‑backed version that mirrors your day‑job work at Atatus.
- **E2E test** (Playwright): browse → pay (test card) → see it in My Trips → refund.
- **Load test** proving the seat logic holds under concurrent checkouts.

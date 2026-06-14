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
money in integer cents · **self‑hosted** on a shared Hetzner box behind Caddy, each
project a self‑contained stack with its **own** Mongo + Redis · **everything
env‑configurable, nothing hardcoded.**

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
12. [Configuration & local development](#12-configuration--local-development)
13. [Deployment — shared Hetzner box, per-project stacks](#13-deployment--shared-hetzner-box-per-project-stacks)
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
| Hosting | Firebase Hosting (to be replaced by the shared Hetzner box, §13) |
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
| DB | **MongoDB** (Mongoose) | Own container per project; any URI via `MONGODB_URI` |
| Cache/holds | **Redis** (ioredis) | Own container per project; sessions, holds, rate‑limit, cache |
| Payments | **Stripe** Hosted Checkout + webhooks (test mode) | `stripe` Node SDK |
| Email | Resend (or Nodemailer/SMTP) | confirmation on payment |
| Infra | Docker Compose (api + web + own mongo + redis) | self‑contained per project; behind shared Caddy (§13) |

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
- **Google strategy** — `passport-google-oauth20`; callback derived from env
  (`${APP_BASE_URL}/api/auth/google/callback`).
- **Account linking (by verified email):** on Google callback → find by `googleId`;
  else find by `email` and attach `googleId` to that user; else create a new user
  (`passwordHash` null).
- `serializeUser` / `deserializeUser` store the Mongo `_id` in the session.
- Middleware: `checkAuthenticated` (booking, My Trips) and `requireAdmin` (admin).
- **Cookies:** because the API is served **same‑origin** with the client (§13), a
  plain `sameSite: "lax"` cookie works — no `SameSite=None`, no CORS. All cookie
  behaviour (`COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAMESITE`) is env‑driven.

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
- [ ] Docker Compose: `space-api` + `space-web` + **own** `space-mongo` + `space-redis`,
      every value read from env (no hardcoded host/port/domain).
- [ ] `.env.example`; `.gitignore` excludes `.env`; `.dockerignore` excludes secrets.

### M1 — Data layer
- [ ] `Destination` + `Launch` models; seed script (lift `data.js`, generate future
      launches with capacity + price).
- [ ] Public reads: `GET /api/destinations`, `/:slug`, `/:slug/launches`.
- [ ] Wire the React Destination page to the API (relative `/api`); images via `imageKey`.

### M2 — Auth (local + Google)
- [ ] `User` model; local signup/login/logout (bcrypt, session).
- [ ] Google OAuth strategy + env‑derived callback + **link‑by‑email**.
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

### M5 — Ship (onto the shared Hetzner box)
- [ ] Bring up this project's own `docker-compose` (api + web + own mongo + redis),
      `web` + `api` published to `127.0.0.1` on project‑unique host ports.
- [ ] Add a `space.subashkumar.dev` block to the shared **Caddy** config
      (`/` → web, `/api/*` → api); Caddy auto‑provisions TLS.
- [ ] Set `APP_BASE_URL=https://space.subashkumar.dev`; register the Stripe **webhook**
      and Google **callback** against that origin.
- [ ] README rewrite (architecture note + **demo credentials** + test‑card note).
- [ ] Update the portfolio entry (§14).

---

## 11. Target architecture

```
                          space.subashkumar.dev   (single origin, via shared Caddy)
  Browser ─HTTPS─▶ ┌──────────────── Caddy (reverse proxy · auto-TLS) ───────────────┐
                   │   /        → space-web   (static React build)                    │
                   │   /api/*   → space-api   (Express + TS · Passport local+Google)  │
                   └────────────────────────────────┬───────────────────────────────-┘
                                                     │  same-origin → relative /api,
                                                     │  first-party cookies, no CORS
                   ┌─────────────────────────────────┴──────────────────────────────┐
                   │  space-api: /destinations /launches /bookings /webhooks /admin   │
                   └──────┬───────────────────┬────────────────────────┬────────────-┘
                          │ sessions, holds,   │ data, atomic           │ checkout redirect
                          │ rate-limit, cache  │ seat reserve/restore   │ + signed webhook
                          ▼                    ▼                        ▼
                  ┌──────────────┐     ┌──────────────┐         ┌──────────────────┐
                  │ space-redis  │     │ space-mongo  │         │  Stripe Checkout │
                  │ (container)  │     │ (container)  │         │   (test mode)    │
                  └──────────────┘     └──────────────┘         └──────────────────┘

   This whole stack is one project on the box. cineplan + portfolio are identical,
   self-contained stacks on the same machine, each routed by its own subdomain.
```

---

## 12. Configuration & local development

**Principle: nothing is hardcoded.** Every host, port, public origin, datastore URL,
OAuth callback, Stripe return URL, and mail setting comes from env. Derived URLs
(OAuth callback, Stripe success/cancel, e‑mail links) are **built from one base URL**
(`APP_BASE_URL`), so a single value flips the entire app between local and any domain.

This project ships its **own** `mongo` + `redis` containers (not shared with other
projects). Run it locally:

```bash
cp .env.example .env          # fill SECRET + Stripe + Google keys
docker compose up --build     # space-api + space-web + space-mongo + space-redis
stripe listen --forward-to localhost:5000/api/webhooks/stripe   # local webhooks
```

For active client work, run `npm start` and set `"proxy": "http://localhost:5000"` in
the client `package.json` so the dev server forwards `/api/*` — **same‑origin in dev
and prod**, which is why CORS / `SameSite=None` are never needed.

**Core / server**

| Variable | Local | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` on the box |
| `HOST` / `PORT` | `0.0.0.0` / `5000` | bind inside the container |
| `APP_BASE_URL` | `http://localhost:5000` | public origin; **all callback/return URLs derive from this** |
| `CLIENT_ORIGIN` | `http://localhost:3000` | CORS allow‑list (only relevant if you run split‑origin) |
| `SECRET` | *(required)* | session secret |

**Datastores (project‑local containers)**

| Variable | Local | Notes |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://space-mongo:27017/space-tourism` | this project's own Mongo |
| `REDIS_URL` | `redis://space-redis:6379` | this project's own Redis (`rediss://` if TLS) |

**Session / cookies**

| Variable | Local | Notes |
| --- | --- | --- |
| `COOKIE_DOMAIN` | *(unset)* | `space.subashkumar.dev` (host‑only) or `.subashkumar.dev` to share across subdomains |
| `COOKIE_SECURE` | `false` | `true` in prod (HTTPS) |
| `COOKIE_SAMESITE` | `lax` | `lax` is enough because the API is same‑origin |

**Google OAuth**

| Variable | Notes |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud console |
| `GOOGLE_CALLBACK_URL` | `${APP_BASE_URL}/api/auth/google/callback` |

**Stripe (test mode)**

| Variable | Notes |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | from `stripe listen` locally / dashboard in prod |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | `${APP_BASE_URL}/booking/success` · `/booking/cancel` |

**Email**

| Variable | Notes |
| --- | --- |
| `RESEND_API_KEY` *(or `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`)* | provider creds |
| `MAIL_FROM` | e.g. `tickets@subashkumar.dev` |

**Client (CRA — build‑time gotcha):** CRA bakes `REACT_APP_*` at **build time**, not
runtime. To avoid rebuilding per environment, the client calls the API with a
**relative `/api` path** and lets Caddy route `/api/*` to `space-api` on the same
origin (§13) — so no `REACT_APP_API_BASE_URL` is needed at all. Keep it only as a
fallback for a split‑origin setup.

**Never commit `.env`** — only `*.env.example`. Stripe stays **test mode** throughout
(card `4242 4242 4242 4242`).

---

## 13. Deployment — shared Hetzner box, per-project stacks

All portfolio projects live on **one Hetzner VPS** behind a single **Caddy** reverse
proxy, routed by **subdomain** (subdomains are free under `subashkumar.dev`). Each
project keeps its **own** `docker-compose` with its **own** mongo + redis — no shared
datastores.

**Box:** Hetzner CX22 (2 vCPU / 4 GB, ~€4/mo) minimum; CX32 (8 GB) for headroom.
Ubuntu + Docker; add a swap file. Caddy runs on the host (apt) and reverse‑proxies
into each project.

**DNS (one domain):**

```
A     subashkumar.dev      → <box IP>
A     *.subashkumar.dev    → <box IP>     # wildcard: add projects without DNS edits
```

**Ports — only `web` + `api` are published, to loopback only.** Mongo/Redis stay
internal to each project's compose network (never published). Internal container ports
can repeat across projects (isolated networks); only the **published host port** must
be unique:

| Subdomain | Container | Host bind (loopback) |
| --- | --- | --- |
| `subashkumar.dev` | portfolio | `127.0.0.1:3000` |
| `cineplan.subashkumar.dev` | cineplan‑web / ‑api | `127.0.0.1:8081` / `:8091` |
| `space.subashkumar.dev` | space‑web / ‑api | `127.0.0.1:8082` / `:8092` |

Publish to `127.0.0.1:<port>` (not `0.0.0.0`) — Docker otherwise punches straight
through `ufw`. Only **80 / 443 / 22** are open publicly; everything else is reached via
Caddy.

**Caddyfile (one file for the whole box):**

```caddyfile
subashkumar.dev {
    reverse_proxy 127.0.0.1:3000
}

cineplan.subashkumar.dev {
    handle /api/* { reverse_proxy 127.0.0.1:8091 }
    handle        { reverse_proxy 127.0.0.1:8081 }
}

space.subashkumar.dev {
    handle /api/* { reverse_proxy 127.0.0.1:8092 }
    handle        { reverse_proxy 127.0.0.1:8082 }
}
```

Caddy auto‑provisions and renews Let's Encrypt certs per host. `.dev` is HSTS‑preloaded
(HTTPS‑only), which this already satisfies.

**Per‑project prod env** (space‑tourism): `APP_BASE_URL=https://space.subashkumar.dev`,
`NODE_ENV=production`, `COOKIE_SECURE=true`. Because `/api/*` is the **same origin** as
the client, `COOKIE_SAMESITE=lax` is enough — **no `SameSite=None`, no CORS.**

**External registrations** (one‑time, against the prod origin):
- Stripe dashboard → webhook `https://space.subashkumar.dev/api/webhooks/stripe` → copy
  the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Google Cloud console → authorized redirect
  `https://space.subashkumar.dev/api/auth/google/callback`.

**Operational checklist:**
- Webhook route uses the **raw body** (mounted before `express.json()`).
- Automate `mongodump` **per project** to off‑box storage (and/or Hetzner snapshots).
- Set per‑container **memory limits** so one project can't OOM the others.
- One `.env` per project on the box; never baked into images (`.dockerignore`).

---

## 14. Wire it into the portfolio

Once deployed, update `next-portfolio/data/index.tsx` — the Space Tourism entry:

- Rewrite `des`, e.g. *"Full‑stack space‑flight booking platform — Node/Express API
  with Google + password auth and Stripe‑paid bookings that can't oversell a launch,
  behind a React + Tailwind UI."*
- Point `link` at `https://space.subashkumar.dev`; keep the `github` link; consider
  adding a Stripe/payments icon to `iconLists`.
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

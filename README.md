# MarketPulse — Your Watchlist, Already Watched

Most watchlists tell users what their stocks are doing.

This app tells them **what changed since they last looked — and why it matters.**

When a user marks their watchlist as checked, the system stores a **baseline snapshot** (price, volume, news state, sentiment, volatility). On the next visit it compares the latest market state against that baseline. A deterministic engine turns those signals into an explainable 0–100 Attention Score, ranks only the stocks that deserve attention, and shows exactly what drove the score.

So instead of opening a list and asking “What should I look at?”, the user gets: **“These 3 stocks changed meaningfully. Here’s why.”**

We don’t build a better watchlist. We build the layer that watches the watchlist for you.

## Features

- **Attention summary** — “3 of 12 stocks need your attention” (High / Medium / Quiet)
- **Combination-aware scoring** — isolated +1% is noise; volume + news + price is high-impact
- **Why it matters** — intelligence copy that explains combinations, not just raw moves
- **Driver breakdown** — points per signal (price, volume, news, sentiment, volatility)
- **Change history** — how attention evolved across successive snapshots
- **Persistent snapshots** — baseline captured on “Mark all as checked”
- **Watchlist management** — add/remove up to 15 US symbols with search
- **Stock detail** — chart, snapshot vs now, headlines, history
- **Robust UI states** — loading, empty, stale-data, and error handling

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js Route Handlers (REST API)
- **Database:** PostgreSQL + Prisma
- **Market data:** Finnhub (free developer tier)

No Redis, job queues, microservices, or Kubernetes — Postgres caching keeps the MVP simple and reliable.

---

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)
- [Finnhub API key](https://finnhub.io/register) (free tier)

---

## Local setup

### 1. Clone and install

```bash
cd groww
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://groww:groww@localhost:5432/groww?schema=public"
AUTH_SECRET="use-a-long-random-string-at-least-32-characters"
FINNHUB_API_KEY="your-finnhub-api-key"
```

Generate a secure `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

The seed creates a demo account:

| Field | Value |
|-------|-------|
| Email | `demo@marketpulse.app` |
| Password | `password123` |

Plus a starter watchlist: AAPL, MSFT, NVDA, TSLA, AMZN.

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Product loop (demo)

1. Add 5 stocks on **Watchlist**
2. Click **Mark all as checked** — baseline snapshot created
3. Wait for market movement (or return later)
4. Open the dashboard — **“N of 5 stocks need your attention”**
5. Open a high-attention card — score, why it matters, driver bars
6. Open **Change history** on the stock page — how the situation evolved across check-ins
7. Mark all as checked again — baseline resets

---

## Development fallback (optional)

If you cannot use Finnhub locally, you may enable deterministic synthetic data **in development only**:

```env
USE_DEV_MARKET_DATA_FALLBACK=true
```

This is clearly isolated in `lib/market-data/dev-fallback.ts` and must never be used in production.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm test` | Run unit tests (scoring engine + constraints) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed demo user and watchlist |
| `npm run db:studio` | Open Prisma Studio |

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/sylc` | Ranked Since You Last Checked feed |
| POST | `/api/sylc/acknowledge` | Create new snapshot baseline |
| GET | `/api/watchlist` | List watchlist symbols |
| POST | `/api/watchlist` | Add symbol |
| GET | `/api/symbols/search?q=AAPL` | Symbol search |

---

## How it knows what changed

```
User → Watchlist → Baseline snapshot
         ├── price
         ├── volume
         ├── news state
         ├── sentiment
         └── volatility
                    ↓
              Current state
                    ↓
         Combination-aware signal engine
                    ↓
              Attention score (0–100)
                    ↓
     Ranked feed (only stocks that need you)
```

“Mark all as checked” is not a dismiss button. It writes a new immutable snapshot. The next visit diffs against that snapshot.

## Scoring model

Each symbol gets a **0–100 attention score** from weighted signals, plus a **combination bonus** when multiple signals fire together:

| Signal | Weight |
|--------|--------|
| Price movement | 30% |
| Volume anomaly | 25% |
| News & events | 25% |
| Sentiment shift | 15% |
| Volatility (ATR) | 5% |

**Contextual classes (not isolated moves):**

| Class | Example | Outcome |
|-------|---------|---------|
| Normal | AAPL +1.2%, normal volume | Quiet — skip |
| Interesting | AAPL +4.8%, 2.7× volume | Medium attention |
| High-impact | AAPL +3%, unusual volume + earnings + negative sentiment | High attention |

Scoring is fully deterministic — no LLM is used for ranking. “Why it matters” is assembled from the active signal set so combinations read as an intelligence layer, not a ticker tape.

---

## Project structure

```
app/
  (auth)/          Login & register
  (dashboard)/     SYLC home, watchlist, stock detail
  api/             REST endpoints
components/
  sylc/            Attention cards, signal breakdown
  stock/           Price chart
lib/
  scoring/         Deterministic scoring engine
  market-data/     Finnhub adapter + Postgres cache
  snapshots/       Snapshot lifecycle + SYLC feed
prisma/            Schema, migrations, seed
```

---

## Testing

```bash
npm test
```

Tests cover:

- Headline sentiment and normalization helpers
- Combination classes (normal / interesting / high-impact)
- Deterministic composite scoring, combination bonus, and “needs attention”
- Watchlist/scoring constraints

---

## Deploy a public demo (Vercel)

This is the URL you submit as the demo link.

1. Create a free Postgres database on [Neon](https://neon.tech). Copy the connection string (prefer the **direct / non-pooled** URI for Prisma).
2. Open [Vercel](https://vercel.com) → **Add New** → **Project** → import `Iamdivya16/marketpulse`.
3. Add environment variables (Production):

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `FINNHUB_API_KEY` | Your Finnhub key |

4. Deploy. The build runs `prisma migrate deploy` so tables are created.
5. Seed the demo user **once** from this laptop (uses your production `DATABASE_URL`):

```bash
cd /Users/apple/Desktop/groww
DATABASE_URL="paste-neon-url-here" npx prisma db seed
```

6. Open the Vercel URL and log in with `demo@marketpulse.app` / `password123`.

Submit that Vercel URL as the demo link. Source stays at https://github.com/Iamdivya16/marketpulse

---

## Deployment notes

- Set `AUTH_SECRET`, `DATABASE_URL`, and `FINNHUB_API_KEY` in the host environment
- Finnhub free tier: ~60 API calls/min — bars and news are cached in Postgres

---

## License

MIT

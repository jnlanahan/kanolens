# Deploying KanoLens to Production (Railway)

This is the step-by-step checklist for when you're ready to go live. Nothing here
has to be done until you decide to deploy — the codebase is already production-ready.

**Host:** Railway (always-on Node server + managed Postgres). Chosen over Vercel
because KanoLens streams analyses over long-lived SSE connections and keeps an
in-memory event bus — both of which Vercel's serverless functions break.

**What's automatic:** Database migrations run on server boot, and the server
serves the built React app itself. You do **not** run any migration command by hand.

---

## 0. Before you start — accounts you'll need

- A **Railway** account (https://railway.app), connected to your GitHub.
- **Anthropic API key** — https://console.anthropic.com
- **Google AI (Gemini) API key** — https://aistudio.google.com/apikey
- **Google OAuth client** — Google Cloud Console (for sign-in)
- **Stripe account** with live mode enabled (for $5/run billing)

---

## 1. Create the Railway project + database

1. Push your latest code to GitHub (the `main` branch).
2. In Railway: **New Project → Deploy from GitHub repo → select kanolens**.
3. Railway reads `railway.json` automatically: it builds with `npm run build` and
   starts with `npm start`, and health-checks `/health`.
4. In the same project: **New → Database → Add PostgreSQL**. Railway creates a
   Postgres instance and exposes a `DATABASE_URL` variable.
5. Attach that `DATABASE_URL` to your web service (Railway → web service →
   Variables → reference the Postgres `DATABASE_URL`).

> The first deploy may fail until you finish step 2 below (env vars). That's expected.

---

## 2. Set environment variables (Railway → web service → Variables)

Required — the server refuses to boot without these:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (from the Railway Postgres plugin) |
| `JWT_SECRET` | a fresh random string — run `openssl rand -hex 32` and paste the output |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `GEMINI_API_KEY` | your Google AI key |

Strongly recommended (features return "service unavailable" without them):

| Variable | Value |
|---|---|
| `PUBLIC_WEB_ORIGIN` | your live URL, e.g. `https://kanolens.up.railway.app` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from step 3 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | from step 4 |

Optional: `SENTRY_DSN`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`.

> `PORT` is set by Railway automatically — don't set it yourself.

After Railway gives you a public domain, copy it into `PUBLIC_WEB_ORIGIN` and redeploy.

---

## 3. Google OAuth (sign-in)

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID → Web application**.
2. **Authorized redirect URI:** `https://<your-railway-domain>/api/auth/google/callback`
   (must exactly match `PUBLIC_WEB_ORIGIN` + `/api/auth/google/callback`).
3. Copy the Client ID and Client Secret into the Railway variables above.

---

## 4. Stripe (live $5/run billing)

1. In Stripe, switch to **live mode**, then **Developers → API keys** → copy the
   live secret key into `STRIPE_SECRET_KEY`.
2. **Products → Add product**, create a one-time **$5** price, copy the `price_...`
   ID into `STRIPE_PRICE_ID`.
3. **Developers → Webhooks → Add endpoint:**
   - URL: `https://<your-railway-domain>/api/payments/webhook`
   - Event: `checkout.session.completed`
   - After creating it, copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

> Your own account (`jnlanahan@gmail.com`) runs free automatically — billing only
> applies to everyone else (one free run, then $5 per run). This is already in code.

---

## 5. Deploy + verify

1. Trigger a deploy (push to `main`, or Railway → Deploy).
2. Watch the deploy logs. You should see:
   - `[db] connected to Postgres; migrations applied`
   - `[kanolens] api listening on ...`
   - `/health` going green in Railway.
3. Open your live URL — the app should load (not a blank page or 404).
4. **Smoke test:**
   - Sign in with your Google account → confirm you can run an analysis for free.
   - Sign in with a *different* Google account → confirm it runs once free, then
     hits the $5 paywall and Stripe checkout works on the second run.
   - Confirm the Kano table streams rows with citations.

---

## Updating after launch

Just push to `main`. Railway rebuilds, runs any new migrations on boot, and
restarts. If you change `server/db/schema.ts`, generate a migration first
(`npm run db:generate`) and commit the new files in `drizzle/` so they ship and
apply automatically on the next deploy.

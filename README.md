# CoffeMC API — Cloudflare Worker backend

This Worker powers:

- Register / login / email verification
- "Pending items" dashboard after a purchase
- Admin dashboard with one-click order approval + Discord alerts
- Player report form (name + video proof up to 50MB) stored in R2, with a
  Discord webhook and a 1-report-per-day-per-IP limit

## 1. Prerequisites

- A Cloudflare account
- [Node.js](https://nodejs.org/) + the Wrangler CLI:

```bash
npm install -g wrangler
wrangler login
```

## 2. Create the D1 database (this is your "database")

> Cloudflare R2 is **object storage** (good for files like report videos),
> not a queryable database. For users / orders / reports we use **D1**
> (Cloudflare's built-in SQL database), and we use **R2** only to store the
> uploaded report videos. This is the correct combination for what you asked
> for and is included below.

```bash
cd worker
wrangler d1 create coffemc-db
```

Copy the `database_id` it prints into `wrangler.toml` under `[[d1_databases]]`.

Apply the schema:

```bash
wrangler d1 execute coffemc-db --remote --file=./schema.sql
```

## 3. Create the R2 bucket (for report videos)

```bash
wrangler r2 bucket create coffemc-reports
```

## 4. Create the KV namespace (report rate-limiting)

```bash
wrangler kv namespace create RATE_LIMIT
```

Copy the returned `id` into `wrangler.toml` under `[[kv_namespaces]]`.

## 5. Set your config vars

Edit `wrangler.toml` → `[vars]`:

- `SITE_URL` — where your site is hosted (e.g. `https://coffemc.xyz`)
- `WORKER_URL` — this Worker's URL (e.g. `https://coffemc-api.yourname.workers.dev`)
- `MAIL_FROM` — sender address for verification emails
- `ADMIN_EMAILS` — comma-separated list of emails that should be admins.
  Anyone who registers (or logs in) with one of these emails automatically
  gets admin access to `/admin.html`.
- `ALLOWED_ORIGIN` — your site's origin, for CORS (use `*` while testing)

## 6. Set secrets

```bash
wrangler secret put JWT_SECRET
# any long random string, e.g. output of: openssl rand -hex 32

wrangler secret put RESEND_API_KEY
# from https://resend.com — free tier is enough for verification emails.
# If you skip this, registration still works but no verification email is
# sent, so accounts can never be verified/logged in — set this up.

wrangler secret put DISCORD_ORDER_WEBHOOK
# Discord server → channel settings → Integrations → Webhooks → New Webhook
# (this is where "someone bought X" alerts go)

wrangler secret put DISCORD_REPORT_WEBHOOK
# a separate webhook (can be a different channel) for player reports
```

## 7. Deploy

```bash
wrangler deploy
```

Wrangler will print your Worker's URL — put that into:

- `wrangler.toml` → `WORKER_URL`
- the frontend's `auth.js` → `API_BASE`

Redeploy after changing `wrangler.toml` vars:

```bash
wrangler deploy
```

## 8. Becoming an admin

1. Register a normal account on the site using an email listed in
   `ADMIN_EMAILS`.
2. Verify the email (link sent via Resend).
3. Log in — the Worker automatically marks the account as admin.
4. Visit `/admin.html` on your site.

## API summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/register` | – | Create account, sends verification email |
| GET | `/api/verify?token=` | – | Verify email (clicked from email) |
| POST | `/api/login` | – | Returns a JWT + user info |
| GET | `/api/me` | user | Current user info |
| POST | `/api/orders` | user | Create a pending order, notifies Discord |
| GET | `/api/orders/mine` | user | Orders for the logged-in user (dashboard) |
| GET | `/api/admin/orders` | admin | All orders |
| POST | `/api/admin/orders/:id/approve` | admin | Mark an order approved |
| POST | `/api/report` | – (1/day per IP) | Submit a report + ≤50MB video, stores in R2, notifies Discord |
| GET | `/api/admin/reports` | admin | List reports |
| GET | `/api/admin/reports/:id/video` | admin | Stream a report's video from R2 |

## Notes & limitations

- **Discord attachment size**: Discord webhooks cannot reliably attach
  50MB videos (Discord's own limit is much lower). Report videos are stored
  in R2 and the Discord alert just tells admins to check `/admin.html`,
  where the video can be streamed/downloaded.
- **Rate limiting** uses the reporter's IP address (hashed, never stored in
  plain text) and resets after 24 hours.
- Passwords are hashed with PBKDF2-SHA256 (100,000 iterations) — never
  stored in plain text.

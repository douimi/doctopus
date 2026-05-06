# Production deploy — Vercel + Supabase + custom domain

Step-by-step guide for putting Doctopus live at **`https://mydoctopus.tech`**.

Estimated total: **30–45 minutes** if everything goes smoothly. The DNS
propagation step is the only one with a real wait (a few minutes to a few
hours, typically <1h).

---

## 0. Pre-flight checklist

Before starting, make sure you have:

- A **Vercel** account (free Hobby tier is fine for the pilot).
- A **Supabase** account, on the **Pro** tier ideally (Free tier works for
  testing but pauses after 1 week of inactivity and has a 500 MB cap).
- The repo pushed to `github.com/douimi/doctopus` (already done).
- Domain `mydoctopus.tech` purchased and access to its DNS records at
  your registrar (Namecheap, GoDaddy, OVH, Gandi…).
- A way to receive emails at `douimiotmane@gmail.com` for the
  super-admin allowlist.

---

## 1. Create the Supabase project

1. https://supabase.com/dashboard → **New project**.
2. **Region**: Frankfurt (`eu-central-1`) or Paris (`eu-west-3`). Pick the
   closest one your account supports — lower latency to Morocco.
3. **Database password**: generate a strong one and store it in a
   password manager. Supabase will not show it again.
4. Wait ~2 min for the project to provision.

> Free tier note: if you stay on Free, the project pauses after 7 days
> of inactivity. Upgrade to Pro before onboarding the first paying
> cabinet.

---

## 2. Apply the database migrations

From your local repo, with the **direct** connection string (not the
pooler), run:

```bash
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push
```

`<project-ref>` is the slug in your Supabase project URL
(`https://app.supabase.com/project/<project-ref>`).

This applies every migration in `supabase/migrations/` in order
(0000 → 0012, plus the timestamp-prefixed RLS files).

**Verify**:

```bash
pnpm exec supabase db remote-list
```

Should list 20-something migrations applied.

If `db push` fails with a permission error on `pgcrypto`, run this once
in the Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Then re-run `db push`.

---

## 3. Collect connection strings & API keys

In the Supabase dashboard, **Project Settings → Database → Connection
string**:

- `DATABASE_URL` — **Pooler** mode "Transaction" (for the running app).
- `DATABASE_URL_DIRECT` — **Direct connection** (for migrations & cron).

In **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — the project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key (safe in the browser).
- `SUPABASE_SERVICE_ROLE` — the **service_role** key (server-only, treat
  like a password).

Then generate two secrets locally (e.g. with `openssl rand -base64 48`):

- `CRON_SECRET` — used to authenticate cron jobs hitting protected routes.
- `CHATBOT_KEY_ENCRYPTION_KEY` — at least 16 chars; encrypts per-tenant AI
  API keys at rest. **If you ever lose this, every existing per-tenant
  API key becomes unrecoverable** (set new ones from /admin). Store it
  in a password manager alongside the Supabase password.

---

## 4. Deploy to Vercel

1. https://vercel.com → **Add new project** → import `douimi/doctopus`
   from GitHub.
2. **Framework preset**: Next.js (auto-detected).
3. **Root directory**: project root (don't change).
4. **Build command** / **Output**: leave defaults.
5. **Environment variables** — add every key from `.env.example`:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from §3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from §3 |
   | `SUPABASE_SERVICE_ROLE` | from §3 (server-only) |
   | `DATABASE_URL` | pooler URL |
   | `DATABASE_URL_DIRECT` | direct URL |
   | `APP_URL` | `https://mydoctopus.tech` (set this now even if the domain isn't live yet) |
   | `CRON_SECRET` | generated in §3 |
   | `CHATBOT_KEY_ENCRYPTION_KEY` | generated in §3 |
   | `SUPER_ADMIN_EMAILS` | `douimiotmane@gmail.com` (comma-separated) |
   | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `MISTRAL_API_KEY` | optional — only the ones you want as platform fallbacks |
   | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | optional — leave blank if no Sentry |

   For each variable, **uncheck "Preview"** unless you want it to apply
   to PR preview deploys too. Set **all** for "Production" at minimum.

6. Click **Deploy**.
7. Wait ~2 min. The first deploy gives you a temporary URL like
   `doctopus-<hash>.vercel.app`. Open it — you should see the landing
   page. Don't sign in yet; the super-admin doesn't exist yet.

---

## 5. Connect `mydoctopus.tech`

### 5.1 Add the domain in Vercel

1. Vercel → your project → **Settings → Domains**.
2. Type `mydoctopus.tech` → **Add**.
3. Vercel offers two ways:
   - **Apex** (`mydoctopus.tech`): an `A` record pointing to
     `76.76.21.21`.
   - **Subdomain** (`www.mydoctopus.tech`): a `CNAME` pointing to
     `cname.vercel-dns.com`.
4. Add **both**: the apex for the bare domain and the `www` subdomain.
   Vercel will redirect `www` → apex (or the other way) — you'll pick
   in step 5.3.

### 5.2 Configure DNS at your registrar

Log into the dashboard where you bought `mydoctopus.tech` (Namecheap,
Gandi, GoDaddy, OVH…). Find the **DNS records** for the domain.

Add **two records**, replacing or removing any conflicting `A` /
`CNAME` records on `@` and `www`:

| Type    | Host / Name | Value                  | TTL          |
|---------|-------------|------------------------|--------------|
| `A`     | `@`         | `76.76.21.21`          | Auto / 300 s |
| `CNAME` | `www`       | `cname.vercel-dns.com` | Auto / 300 s |

If your registrar doesn't accept a `CNAME` on `@` (most don't, RFC
1912), keep using the `A` record above for the apex — that's what
Vercel actually recommends for apex domains. Some registrars (Cloudflare,
DNSimple) support `ALIAS` / `ANAME` on apex; either works.

> **Cloudflare users**: set the proxy status to **DNS only** (gray
> cloud, not orange) — Vercel handles SSL itself, and double-proxying
> through Cloudflare causes redirect loops.

### 5.3 Wait for DNS + SSL

Back in Vercel → **Settings → Domains**, both records should flip from
"Invalid Configuration" → "Valid Configuration" within a few minutes
(occasionally up to an hour). Vercel auto-provisions a Let's Encrypt
certificate as soon as DNS validates.

In the same panel, set the **primary** domain (the canonical one).
Recommendation: make `mydoctopus.tech` primary, redirect `www` → apex.

### 5.4 Verify

```bash
curl -I https://mydoctopus.tech
```

Should return `HTTP/2 200` and an `x-vercel-id` header. Open
`https://mydoctopus.tech` in a browser — you should land on the new
landing page.

---

## 6. Bootstrap the super-admin

1. Locally, with your `.env.local` pointing at the **production**
   `DATABASE_URL`:

   ```bash
   pnpm admin:create-super-admin --email douimiotmane@gmail.com
   ```

   This prints a sign-in link valid 7 days.

2. Open the link → set a password.
3. You're now signed in. Hit `https://mydoctopus.tech/admin` — the
   super-admin dashboard should load.
4. From `/admin/invites` send the first cabinet invitation.

---

## 7. Smoke test

Run through the golden path on the live domain:

- [ ] Open `https://mydoctopus.tech` (landing page, no console errors).
- [ ] Sign in as super-admin → `/admin` loads.
- [ ] Create an invitation → open the link in an incognito window →
      complete onboarding → land on `/today`.
- [ ] As a doctor, create a patient → start a walk-in → open the
      consultation → search "doli" in the prescription editor (hits
      medicament.ma live).
- [ ] Finalise the consultation with a price → as the assistant
      account, encaisser the payment.
- [ ] Open `/today` in two tabs → confirm real-time updates flow
      (a walk-in created in tab A appears in tab B without refresh).

---

## 8. Post-launch checklist

- **Sentry** (recommended): create a Vercel-Sentry integration → the
  DSN env vars get auto-injected.
- **Backups**: Supabase Pro keeps daily PITR; Free has weekly snapshots.
- **Monitoring**: Vercel → Project → **Analytics** + **Logs** are free.
- **Domain renewal**: set autorenew at the registrar, set the renewal
  email to one you actually read.
- **Status page** (optional): https://www.uptimerobot.com → free
  monitor on `https://mydoctopus.tech/today` (or any unauthenticated
  endpoint).

---

## Restore from backup (Supabase)

Free tier keeps daily backups for 7 days. Pro keeps 30 days + PITR.

1. Supabase dashboard → **Database → Backups**.
2. Pick a backup → **Restore**.
3. Confirm. Restore is in-place; no separate target project needed.

---

## Common issues

**`column "rpm_number" does not exist`** after a deploy → the build is
stale. Trigger a fresh deploy from Vercel (Settings → Deployments →
Redeploy without cache).

**Medication search returns nothing** → check that the Vercel function
can reach `medicament.ma` (their `wp-admin/admin-ajax.php` endpoint).
The runtime fetches it directly with the standard Node client; no
custom dispatcher is required.

**Real-time `/today` updates not firing** → ensure migration 0010 ran
in production:

```sql
SELECT tablename FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
```

Should include `appointments` and `consultations`.

**`CHATBOT_KEY_ENCRYPTION_KEY is not configured`** when setting a
per-tenant AI key → add the env var in Vercel and redeploy.

# Deploy Plan 1.A

## 1. Create Supabase project

1. Go to https://supabase.com/dashboard, "New project".
2. Region: Frankfurt (eu-central-1) or Paris (eu-west-3) — pick the one your account supports.
3. Save the database password somewhere safe (you'll never see it again).
4. Wait for the project to be ready (≈2 min).

## 2. Apply migrations to the hosted DB

```bash
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push
```

This pushes both the Drizzle migrations (`supabase/migrations/0000_*.sql`) and the
hand-written RLS migration (`supabase/migrations/20260501000000_rls_policies.sql`).

## 3. Get connection strings and keys

In the Supabase dashboard:

- **DATABASE_URL** — "Project Settings" → "Database" → "Connection string" (Pooler, mode "Transaction")
- **DATABASE_URL_DIRECT** — same panel, "Direct connection"
- **NEXT_PUBLIC_SUPABASE_URL** — "Project Settings" → "API" → URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** — "Project Settings" → "API" → anon key
- **SUPABASE_SERVICE_ROLE** — "Project Settings" → "API" → service_role key (keep secret)

## 4. Deploy on Vercel

1. Push the repo to GitHub.
2. Import on https://vercel.com → "Add new project".
3. Framework: Next.js. Root directory: project root.
4. Environment variables — copy every key from `.env.example`, fill from Supabase.
   Generate a fresh `CRON_SECRET` (≥32 random chars).
   Set `APP_URL` to `https://<your-project>.vercel.app` initially.
5. Deploy.
6. Once you have a custom domain attached, update `APP_URL` and redeploy.

## 5. Smoke test

```bash
APP_URL=https://<your-project>.vercel.app pnpm invite:doctor --email you@example.com
```

Open the printed URL → complete onboarding → confirm `/today` loads.

## 6. Medication search (no seed required)

Medication search is now backed by the ANAM e-services live API
(`e-services.anam.ma`). The `medications` table is no longer populated by a
sync script — searches hit ANAM directly and prescription items snapshot the
EAN-13 + full medication row at prescribe time.

No post-deploy step is required for medication search. Smoke-test it from the
prescription editor (`/consultations/<id>` → Traitement → search "doli") to
confirm outbound HTTPS to `e-services.anam.ma` is reachable from production.

## Restore from backup (Supabase free tier)

Supabase keeps daily backups for 7 days on the free tier.

1. Dashboard → "Database" → "Backups".
2. Pick the backup → "Restore".
3. Confirm. Restore is in-place; no separate target project needed for the free tier.

A clean cutover for a paid project (different procedure) is documented separately when we
move to Pro before the second tenant onboards.

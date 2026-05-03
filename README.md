# Doctopus

Multi-tenant medical practice management for Moroccan generalists.

## Plan 1.A scope (this branch)

Foundation only: auth, tenant onboarding via invite link, assistant invitations. No application features yet.

## Local development

### Prerequisites

- Node 22 (`nvm use`)
- pnpm 10+
- Docker Desktop (for `supabase start`)

### One-time setup

```bash
pnpm install
# Restore the supabase CLI binary into node_modules/.bin (pnpm strips it on each install):
cp node_modules/.pnpm/supabase@*/node_modules/supabase/bin/supabase.exe node_modules/.bin/supabase.exe

pnpm supabase:start             # boots local Postgres, Auth, Storage on Docker
cp .env.example .env.local      # then paste the keys printed by `pnpm exec supabase status -o env`
pnpm exec supabase db reset     # applies all migrations (drizzle + RLS)
```

### Run

```bash
pnpm dev                        # http://localhost:3000
```

### Invite a doctor (manual platform-admin action)

```bash
pnpm invite:doctor --email dr@example.ma
```

The script prints a one-time invite URL valid for 7 days.

### Tests

```bash
pnpm test                       # vitest (unit + RLS)
pnpm test:rls                   # RLS isolation only
pnpm test:e2e                   # Playwright (boots dev server)
```

## Architecture

See [`docs/superpowers/specs/2026-04-30-doctopus-mvp-design.md`](docs/superpowers/specs/2026-04-30-doctopus-mvp-design.md).

## Implementation roadmap

- [x] **Plan 1.A — Foundation** ([plan](docs/superpowers/plans/2026-04-30-doctopus-1a-foundation.md))
- [x] **Plan 1.B — Patients & day view** ([plan](docs/superpowers/plans/2026-05-01-doctopus-1b-patients-day-view.md))
- [x] **Plan 1.C — Consultations** ([plan](docs/superpowers/plans/2026-05-01-doctopus-1c-consultations.md))
- [x] **Plan 1.D — Medication DB & prescriptions** ([plan](docs/superpowers/plans/2026-05-03-doctopus-1d-medications-prescriptions.md))
- [ ] Plan 1.E — Audit log & production hardening

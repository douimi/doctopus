# AMMPS Integration Research

**Date:** 2026-05-03
**Source:** [https://ammps.sante.gov.ma](https://ammps.sante.gov.ma) — Agence Marocaine du Médicament et des Produits de Santé (the successor to the DMP).

## What's actually exposed

The site has two relevant URLs:

| URL | Format | Use |
|---|---|---|
| `/recherche-medicaments?search=Q&page=N` | HTML cards (server-rendered) + AJAX modal | Public search UI |
| `/basesdedonnes/listes-medicaments?page=N` | **Flat HTML `<table>`** with all columns | Browse the full database |
| `/getmedecinedata/{id}` | HTML fragment (jQuery `$.get`) | Detail modal for one card |

There is **no public JSON API**. The site is a Laravel-style PHP app (`X-Powered-By: PHP/7.4.25`, `dmp_dist_session` Laravel-encrypted cookie).

The server does set `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Methods: GET`, so cross-origin reads from a browser are technically possible — but you still get HTML, not data, so a parser is required either way.

**TLS quirk:** the AMMPS server presents an incomplete certificate chain. Standard `fetch` works in most environments; Node's strict TLS chain validator fails without `NODE_TLS_REJECT_UNAUTHORIZED=0` or a custom HTTPS agent. Our sync script handles this.

## Best-fit endpoint: `/basesdedonnes/listes-medicaments`

This page is a single flat table with **14 columns** that map cleanly to our `medications` schema:

| Column | Our field |
|---|---|
| STATUT AMM | (ignored — we only sync AMM-registered drugs) |
| STATUT COMMERCIALISATION | maps to `is_active` (Commercialisé → true) |
| SPECIALITE | `nom_commercial` |
| DOSAGE | `dosage` |
| FORME | `forme` |
| PRESENTATION | `presentation` |
| PP GN | (ignored — internal price tier label) |
| SUBSTANCE ACTIVE | `dci` |
| CLASSE THERAPEUTIQUE | `classe_therapeutique` |
| EPI | `laboratoire` (Etablissement Pharmaceutique Industriel) |
| PPV | `ppv` |
| PH | `metadata.ph` |
| PFHT | `metadata.pfht` |
| TVA | `metadata.tva` |

Pagination: ~197 pages, ~10–20 rows/page → roughly 2 000–4 000 medications. Total sync time at 100 ms throttle: ≈ 5 minutes.

## Integration strategy chosen — **periodic sync, not live proxy**

| Option | Verdict |
|---|---|
| **Periodic sync** (chosen) | Local search stays sub-100ms, no AMMPS dependency at consultation time, well-cached for offline dev. Stale by ~hours/days at worst. |
| Live proxy on every search | AMMPS is HTML-only, page-based, ~500 ms per request, occasional outages — would make every consultation a hostage to their uptime. **Rejected.** |
| Manual xlsx import | What we have today (Plan 1.D). Keeps working as a fallback when AMMPS is unreachable. We keep it. |

The sync script targets the same `medications` table the existing xlsx import uses. The natural-key `(lower(nom_commercial), lower(dosage), lower(forme), lower(laboratoire))` from Plan 1.D's migration handles upserts identically for both data sources.

## Implementation

`scripts/sync-ammps.ts`:
- HTTPS agent with `rejectUnauthorized: false` to handle the cert chain issue.
- Streams pages 1..N, parses `<tbody>` rows with a small regex over `<td class="text-left">…</td>` cells.
- Throttles 100 ms between page fetches.
- Upserts per row using the same composite key the xlsx import uses.
- Records the run in `medication_imports` (same schema, source named `ammps:listes-medicaments`).
- Marks rows that haven't been seen in this batch and were last seen >90 days ago as `is_active=false` (soft delete) — preserves historical prescription snapshots.

Run with:

```bash
pnpm sync:ammps                 # sync everything
pnpm sync:ammps --max-pages 5   # quick test
```

## What this does NOT do

- **No automated schedule yet.** Run manually or via a cron handler we'll add in Plan 1.E.
- **No WebSocket / push updates.** AMMPS doesn't expose them.
- **No multilingual handling.** AMMPS table is French; our app is French — fine for now.
- **No legal review of scraping ToS.** The site has no robots.txt directive that blocks `/basesdedonnes/`, but a real production deployment should ask AMMPS for explicit permission. For MVP and a low-traffic single-tenant pilot, the request volume (≈197 pages once a day) is well below abusive levels.

## When AMMPS changes

If they restructure the table (column order changes, classes change, pagination changes), the sync will fail loudly: page parser asserts row column count = 14, and we log unparseable rows. Fix the parser, re-run.

If they introduce a real JSON API later, swap the parser; the rest of the script and the schema are unchanged.

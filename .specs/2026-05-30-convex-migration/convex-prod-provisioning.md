# CONVEXCORE-15 — Production Convex provisioning runbook

**Scope:** everything required to take the Convex backend from "deploys to an ephemeral CI backend"
to "deploys to a real production deployment on every master push". The repo-side wiring (deploy.yml /
release.yml `convex` jobs, dry-run gate, loud skip-when-unconfigured) is committed with this doc;
everything that needs operator credentials is an explicit checklist item below and is **not** done.

---

## 0. OPERATOR-BLOCKED CHECKLIST (nothing below this list is automated)

Every item needs credentials this repo / CI must never hold. Until item 2 is done, the `convex` jobs
in `deploy.yml` / `release.yml` skip with a `::warning` annotation on every master run — that
annotation disappearing is the signal the wiring is live.

- [ ] **1. Create the production Convex deployment** (Convex Cloud, see §1 for the decision and
      §2 for steps). Record the production `CONVEX_URL` (`https://<slug>.convex.cloud`) here: `____`
- [ ] **2. Generate a production deploy key** and add it as the GitHub Actions repository secret
      `CONVEX_DEPLOY_KEY` (§3).
- [ ] **3. Seed the production deployment env vars** (`CONVEX_SERVER_SECRET`,
      `CONVEX_REVALIDATE_SECRET`, `CONVEX_AUTH_ISSUER`, `CONVEX_AUTH_APPLICATION_ID`,
      `CONVEX_AUTH_JWKS_URL`) **BEFORE the first keyed deploy** — `auth.config.ts` validates them at
      push time (§4).
- [ ] **4. Set the Vercel project env vars** for the storefront and admin projects (§5).
- [ ] **5. Enable backups**: turn on Convex Cloud automatic backups for the prod deployment and/or
      wire the `crons.ts` export-snapshot destination (§7).
- [ ] **6. Re-run the SPIKE-01 latency measurement from a Vercel function co-located with the chosen
      Convex region** — the cold-miss p99 gate is NOT firmed (§1.2). Mandatory before cutover GO.
- [ ] **7. Delete the throwaway SPIKE-01 cloud project** (`commerce-spike`, deployment
      `fantastic-possum-263`) from dashboard.convex.dev if still present
      (spike doc §8.4 — the CLI cannot delete cloud projects).

---

## 1. Cloud vs self-host — decision

**Decision: Convex Cloud for production.** Self-hosting remains the proven exit door, not the
launch target.

| Axis | Convex Cloud | Self-host |
| --- | --- | --- |
| Ops burden | None (managed Postgres, TLS, upgrades) | Own the backend binary, its SQLite/Postgres store, origin TLS, upgrades pinned to `CONVEX_LOCAL_BACKEND_VERSION` |
| Backups | Built-in automatic backups + dashboard restore | Manual — the `crons.ts` export-snapshot stub needs a destination bucket + credentials wired (§7) |
| Deploy auth | Production deploy keys, scoped + revocable from the dashboard | `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY` (admin key is all-powerful; no scoping) |
| Cost | Usage-billed; SPIKE-01's cost axis PASSES at realistic edge fan-out (sensitive to warm-edge-instance count `P ≳ 29`, see spike §0/§4) | Infra cost only, but adds an on-call surface |
| Exit risk | Mitigated: CI already deploys the identical function bundle to a pinned self-hosted backend on every `packages/convex/**` change (ci.yml `convex` job), so the self-host path stays continuously proven | — |

Supporting facts: the dev deployment (`colorful-aardvark-6`) is already cloud, so the team/project
exists; and the backend is exercised against the self-hosted binary
(`precompiled-2026-05-27-e85ff37`) on every CI run, which keeps the exit door honest without making
production an ops project on day one.

### 1.1 Region choice

Pick the Convex region **co-located/peered with the Vercel serverless/edge region the storefront
runs in** (Vercel project → Settings → Functions → region; align the Convex project region at
creation time — region is a project-creation-time choice, ask Convex support to move an existing
project).

### 1.2 Why region choice is load-bearing (SPIKE-01 citation)

`spike-01-findbydomain-feasibility.md` §8 (cloud re-run, 2026-05-31): cold-miss p99 measured
**193.77 ms @ 1k / 225.61 ms @ 10k tenants** against the **150 ms gate — FAIL from that vantage**,
but the decomposition shows a ~110–115 ms cross-region network-RTT floor (workstation → Convex
region) on top of <6 ms of server work; warm p50 passes at 0.00 ms regardless of vantage. The gate
is therefore **vantage-attributable and NOT firmed**: checklist item 6 (re-measure from a Vercel
function adjacent to the chosen region) is mandatory before the cutover GO, and a poor region pairing
would re-create the FAIL in production for real.

---

## 2. Create the production deployment (operator)

1. `cd packages/convex`.
2. Log in as the team operator: `pnpm dlx convex login` (interactive — this is why CI can't do it).
3. The production deployment of the existing project is created/first-populated by the first
   production push: `pnpm convex:deploy` (runs `convex deploy -y`). **Expect the first push to fail
   auth-config validation until §4's env vars are seeded** — same behavior CI hit on the ephemeral
   backend (ci.yml seeds `CONVEX_AUTH_*` between two passes; commit `23c234dff`). Seed §4 first,
   then push.
4. Record the production deployment URL (dashboard → project → Production, or the
   `https://<slug>.convex.cloud` the CLI prints) in checklist item 1. This value becomes
   `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` on Vercel (§5).

## 3. Generate the deploy key (operator)

1. dashboard.convex.dev → project → **Production** deployment → Settings → "Generate a deploy key".
2. GitHub → `filiphsps/commerce` → Settings → Secrets and variables → Actions →
   **New repository secret** → name `CONVEX_DEPLOY_KEY`, value = the key. Never commit it anywhere;
   never put it in a `vars.` context.
3. From this point the `convex` jobs in `deploy.yml` (every successful master CI run) and
   `release.yml` (release pushes) run `convex deploy --dry-run` then `convex deploy` against
   production. The key encodes the target deployment — no `CONVEX_DEPLOYMENT` var is needed in CI.

## 4. Seed the production deployment env vars (operator)

These live **on the Convex deployment** (read by functions inside the isolate), not on Vercel.
With the prod deploy key exported locally, `convex env set` targets production:

```sh
cd packages/convex
export CONVEX_DEPLOY_KEY=<prod key>   # shell-local; never written to a file
pnpm convex:env set CONVEX_SERVER_SECRET "$(openssl rand -hex 32)"      # must equal the apps' value (§5)
pnpm convex:env set CONVEX_REVALIDATE_SECRET "$(openssl rand -hex 32)"  # must equal the storefront's value (§5)
pnpm convex:env set CONVEX_AUTH_ISSUER https://<admin-or-storefront-origin>
pnpm convex:env set CONVEX_AUTH_APPLICATION_ID <aud-claim, e.g. convex>
pnpm convex:env set CONVEX_AUTH_JWKS_URL https://<storefront-domain>/api/auth/convex-jwks/
```

Notes:

- `auth.config.ts` (customJwt) validates `CONVEX_AUTH_ISSUER` / `CONVEX_AUTH_APPLICATION_ID` /
  `CONVEX_AUTH_JWKS_URL` at deploy time — seed BEFORE the first keyed push or it fails (loudly; the
  deploy.yml job will go red, which is correct).
- `CONVEX_AUTH_JWKS_URL` points at the storefront's `/api/auth/convex-jwks/` route, which derives
  the public JWKS from `CONVEX_AUTH_PRIVATE_KEY` (the pair can never drift). The middleware rewrite
  makes the bare path resolve on the apex tenant domain.
- The deployment signs revalidation events with ONLY the current `CONVEX_REVALIDATE_SECRET`
  (`_PREVIOUS` is an app-side dual-accept knob, never set on Convex — see rotation, §6).

## 5. Vercel project env vars (operator)

Set per project (storefront + admin), Production environment, via Vercel dashboard or
`vercel env add <NAME> production`. "Sensitive" = mark as Sensitive in Vercel so it is write-only.

| Var | Storefront | Admin | Exposure | Value / notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | yes | yes | browser (public) | prod `https://<slug>.convex.cloud` — read by the sanctioned client islands via `convex-client-provider.tsx` |
| `CONVEX_URL` | yes | yes | server | same value; server-side `ConvexHttpClient`s (packages/db seam, middleware `findByDomain`) |
| `CONVEX_SERVER_SECRET` | yes | yes | server, **sensitive** | identical to the deployment value from §4 — the identity-less `serverQuery`/`serverMutation` trust secret |
| `CONVEX_AUTH_PRIVATE_KEY` | yes | yes | server, **sensitive** | RS256 PKCS8 PEM; signs Convex-bound JWTs (`/api/auth/convex-token/`, admin operator tokens) and derives the public JWKS. Generate per `.env.example` (`openssl genpkey -algorithm RSA …`) |
| `CONVEX_AUTH_ISSUER` | yes | yes | server | must equal the deployment's value (§4) — `iss` claim |
| `CONVEX_AUTH_APPLICATION_ID` | yes | yes | server | must equal the deployment's value (§4) — `aud` claim |
| `CONVEX_AUTH_JWKS_URL` | no | no | — | deployment-side only (§4): `auth.config.ts` reads it on the Convex deployment; no app code reads this var, so it does not belong on Vercel |
| `CONVEX_REVALIDATE_SECRET` | yes | no | server, **sensitive** | identical to the deployment value (§4) — HMAC check on `/api/revalidate/convex` |
| `CONVEX_REVALIDATE_SECRET_PREVIOUS` | rotation only | no | server, **sensitive** | dual-accept window during rotation (§6); unset otherwise |
| `STOREFRONT_ACCOUNT_LIVE_ISLAND` | optional | no | server | lane-2 kill switch: unset = live, `0/false/off/disabled` downgrades to snapshot without a deploy |
| `CONVEX_DEPLOY_KEY` | **no** | **no** | — | **Deliberately NOT set on Vercel.** Deploys run from GitHub Actions, not Vercel builds — least privilege. Only revisit if convex deploy ever moves into the Vercel build (record it here if so) |

Out of scope (no Convex involvement): the rest of each app's `.env.example`
(`NEXTAUTH_*`, `FLAGS_SECRET`, S3, Shopify, …) is unchanged by this migration.

## 6. Rotation guidance

- **`CONVEX_SERVER_SECRET`** — single-valued on both sides (no dual-accept): rotation is a
  coordinated swap. Order: set the new value on the Convex deployment (§4 command), then immediately
  update both Vercel projects + redeploy. Between the two steps the identity-less db seam gets
  auth rejections; the storefront middleware degrades via the shop-cache TTL (warm entries keep
  serving for up to 60 s), so rotate off-peak and keep the window to minutes.
- **`CONVEX_REVALIDATE_SECRET`** — has a designed dual-accept window (`.env.example`):
  1. set `CONVEX_REVALIDATE_SECRET_PREVIOUS` (Vercel) to the old value and
     `CONVEX_REVALIDATE_SECRET` (Vercel) to the new one; redeploy;
  2. update the Convex deployment's `CONVEX_REVALIDATE_SECRET` to the new value (it always signs
     with only the current value);
  3. after in-flight deliveries drain (action-retrier backoff horizon), unset `_PREVIOUS`.
- **`CONVEX_AUTH_PRIVATE_KEY`** — the JWKS route serves the public members derived from the single
  current private key, so rotation invalidates tokens signed with the old key once Convex refreshes
  its JWKS cache. Tokens are short-lived (operator TTL 1 h, island tokens shorter), so: swap the key
  on both Vercel projects off-peak, accept a brief auth-fail window (the account island falls back
  to its snapshot by design), done. Keep `kid` binding intact — it is derived from the key.
- **`CONVEX_DEPLOY_KEY`** — generate a new key in the dashboard, update the GitHub secret, revoke
  the old key. No app impact (CI-only credential).

## 7. Export-snapshot cron — parity with CI

`packages/convex/convex/crons.ts` registers the daily `export-snapshot` cron (08:00 UTC) through the
`exportSnapshot` internal action. Because crons ship inside the function bundle, **the production
deploy gets the exact cron CI's ephemeral self-host deploy validates — parity is automatic**, no
workflow wiring needed.

The action body is still the CONVEXCORE-02 STUB (logs; moves no data) because `convex export` is an
admin-CLI operation not callable from inside the isolate and no destination bucket is provisioned.
Operator obligations (checklist item 5):

1. **Now:** enable Convex Cloud automatic backups on the prod deployment (dashboard → Backups) —
   this is the actual data-safety net and exists regardless of the stub.
2. **Follow-up (tracked under CONVEXCORE-02):** provision an object-storage destination + scoped
   credentials and replace the stub body with the export-and-upload trigger; until then the cron
   firing in prod logs are the visible heartbeat that the schedule deployed.

## 8. What is wired from the repo (committed with this doc)

- **`deploy.yml` → `convex` job**: runs after every successful master CI run (`workflow_run`,
  push-event + `head_branch == 'master'` + repo guard), checks out the exact CI-validated
  `head_sha`, and is gated on the `CONVEX_DEPLOY_KEY` secret — missing key emits a
  `::warning title=Convex production deploy SKIPPED::…` annotation and skips, so an unprovisioned
  backend never fails the unrelated Vercel deploy but stays loud in every run log.
- **`release.yml` → `convex` job**: same job (kept in sync by comment cross-reference) so a release
  push deploys the backend alongside publishing; deliberately independent of the `release` job so a
  Convex failure cannot block `@tagtree/*` npm publishing (and vice versa).
- **Dry-run gate**: both jobs run `pnpm --filter @nordcom/commerce-convex convex:deploy:dry-run`
  (the CONVEXCORE-12 expand/contract gate — `convex deploy --dry-run` validates codegen, bundling
  and the schema against LIVE rows without promoting) before the real `pnpm convex:deploy`.
- **Single-pass deploy** (vs ci.yml's two-pass ephemeral dance): production env vars are seeded once
  in §4, so auth-config validation passes on the first push. The ci.yml two-pass + env-seed pattern
  (commit `23c234dff`) exists only because the ephemeral anonymous backend is born env-less.
- **Not paths-filtered, on purpose**: `convex deploy` is idempotent, and a `workflow_run`-triggered
  job cannot reliably compute "what changed since the last deploy" (multi-commit pushes, previously
  skipped runs). Always-deploy-on-green-master means production converges; the per-change gating the
  task sketched is satisfied as a superset. Recorded here as the decision of record.
- **Ordering vs the frontend**: app deploys happen via the Vercel git integration (deploy.yml's
  `vercel` push step is commented out), so backend-before-frontend ordering cannot be enforced from
  this repo today. Safety instead comes from expand/contract discipline + the dry-run gate (new
  functions/fields land additively before app code references them). If the Vercel CLI deploy is
  ever re-enabled, add `needs: [convex]` to the `vercel` job and revisit this paragraph.
- **`bootstrap` action** gained a `binary-caches` input (default `'true'`); the prod-deploy jobs
  pass `'false'` because a cloud `convex deploy` never boots the local mongod/Convex backend
  binaries.

## 9. References

- `spike-01-findbydomain-feasibility.md` §0/§4/§8 — latency/cost verdict, region sensitivity,
  spike-deployment teardown debt.
- `.github/workflows/ci.yml` (`convex` job) — the CONVEXCORE-02 ephemeral self-host deploy this
  wiring mirrors; commit `23c234dff` for the env-seeding two-pass.
- `packages/convex/scripts/deploy-dry-run.ts` + `packages/convex/convex/lib/dryrun.ts` — the
  pre-promotion tightening gate run before every prod deploy.
- `.env.example`, `apps/storefront/.env.example`, `apps/admin/.env.example` — authoritative var
  descriptions mirrored in §5.

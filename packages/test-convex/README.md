# `@nordcom/commerce-test-convex`

The Convex test harness: a local-backend launcher, a daemon wrapper for
persistent dev backends, the canonical seed fixtures every e2e suite depends on,
and the limit-boundary suites that gate `packages/convex` changes in CI.

Internal dev/test utility — it has no production consumer and no stable public
API.

## What's inside

| Export | Source | Purpose |
| --- | --- | --- |
| `startConvex()` | `src/start.ts` | Boots a REAL local Convex backend (ephemeral by default; pass `dataDir`/`port` for a persistent one) and resolves `{ url, adminKey, stop }`. |
| `runDaemon()` | `src/daemon.ts` | Long-running wrapper around `startConvex` that writes PID/URL/admin-key marker files so dev servers and e2e re-attach. |
| `test-convex` (bin) | `src/cli.ts` | CLI front for the daemon (`start` / `stop` / `reset` / `seed`). |
| `seedCanonical()` | `src/seed/canonical.ts` | Seeds the demo tenant (`nordcom-demo-shop.com`) plus its full CMS corpus. Idempotent end-to-end; safe to re-run and heals partial seeds. |
| `seedShop()` / `seedCms()` | `src/seed/` | The two phases of the canonical seed, individually addressable. |
| `./unit` | `src/unit.ts` | `convex-test` helpers for in-memory unit suites (module-map builder). |

## Who uses it

-   **Playwright global setups** (`apps/{storefront,admin}/e2e/global-setup.ts`)
    call `seedCanonical(CONVEX_URL)` so the webServer's middleware resolves the
    same rows the specs assert against, then emit `E2E_TENANT_ID`.
-   **Integration tests** call `startConvex()` for an ephemeral backend per
    suite.
-   **Unit tests** use `convex-test` in-memory via `./unit` — no backend, no
    binary download.

## Limit-boundary suites (`src/limits/`)

Suites that prove behavior `convex-test` cannot: they run against a real local
backend with real persistence and real OCC. Covered: document-size ceilings,
deep-populate fan-out, scan budgets, autosave write conflicts, and the canonical
seed under the real validator set. CI runs them
(`pnpm --filter @nordcom/commerce-test-convex run test src/limits`) whenever
`packages/convex/**` or `packages/test-convex/**` changes; each suite documents
its own time budget.

The backend binary is fetched from `version.convex.dev` and pinned by
`CONVEX_LOCAL_BACKEND_VERSION` in CI — it is NOT covered by `pnpm-lock.yaml`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `CONVEX_LIMITS_TESTS=1` | Opts in the `src/limits/` suites (they boot a real backend and deploy; skipped otherwise). |
| `TEST_CONVEX_INTEGRATION=1` | Opts in the `startConvex` integration spec in `src/start.test.ts`. |
| `CONVEX_PROJECT_DIR` | Overrides the functions directory the launcher pushes (defaults to `packages/convex`). |
| `CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS` | Forwarded to the Convex CLI so cold-cache binary downloads don't trip the startup timeout. |
| `CONVEX_SELF_HOSTED_URL` / `CONVEX_SELF_HOSTED_ADMIN_KEY` | Set by the launcher/CLI to pin the Convex CLI at the ephemeral backend; the live seed accepts the admin key (or `CONVEX_DEPLOY_KEY` for a cloud deployment) as its import credential. |
| `CONVEX_LOCAL_BACKEND_VERSION` | Pins the backend binary version in CI (see above). |

## Scripts

```bash
pnpm --filter @nordcom/commerce-test-convex test             # all suites
pnpm --filter @nordcom/commerce-test-convex run test src/limits  # boundary suites only
pnpm --filter @nordcom/commerce-test-convex typecheck
```

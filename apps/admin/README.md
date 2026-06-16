# `@nordcom/commerce-admin`

The operator / merchant dashboard. A Next.js 16 app where shop owners and Nordcom
operators authenticate, list and manage their shops, and configure integrations
(Shopify primarily).

This is the back-office surface. The customer-facing storefront lives in
[`apps/storefront`](../storefront); the marketing site is [`apps/landing`](../landing).

## Stack

-   **Framework:** Next.js 16 (App Router, Turbopack), React 19
-   **Auth:** Clerk (`@clerk/nextjs`) — operators sign in via Clerk; the server mints a Convex token from Clerk's `convex` JWT template
-   **Data:** `@nordcom/commerce-db` for shops and users (Convex-backed services)
-   **Shopify integration:** `@shopify/shopify-api` (Admin API)
-   **UI:** [Nordstar](https://www.npmjs.com/package/@nordcom/nordstar), Radix UI primitives,
    Tailwind CSS 4, Geist font, `lucide-react` icons
-   **Observability:** OpenTelemetry, Vercel Toolbar

## Quick start

From the repo root:

```bash
pnpm install
pnpm build:packages

pnpm dev:admin
# → https://admin.localhost
```

Required environment variables (defined at the root in [`.env.example`](../../.env.example)):

| Variable                | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `CONVEX_URL`            | Convex deployment for shop / user data.                       |
| `CONVEX_SERVER_SECRET`  | Server-trust secret for the identity-less db client (Auth.js adapter reads). |
| `CONVEX_AUTH_ISSUER` / `CONVEX_AUTH_APPLICATION_ID` / `CONVEX_AUTH_PRIVATE_KEY` | NextAuth-derived RS256 JWT the Convex deployment validates. |
| `AUTH_SECRET`           | NextAuth signing secret.                                      |
| `AUTH_TRUST_HOST`       | Set to `true` for local development.                          |
| `ADMIN_DOMAIN`          | Hostname for the admin (e.g. `admin.example.com`).            |
| `LANDING_DOMAIN`        | Hostname for the marketing site; used for assets and redirects. |
| `GITHUB_ID` / `GITHUB_TOKEN` | GitHub OAuth credentials for sign-in.                    |
| `SHOPIFY_API_KEY`       | Required for the Shopify Admin API integration flow.          |
| `SHOPIFY_API_SECRET_KEY`| Pairs with `SHOPIFY_API_KEY`.                                 |

## Troubleshooting

Two setup gotchas account for most "it builds but the dashboard is broken" reports. Both are
**environment/data**, not code:

### Certain dashboard pages 500 ("This page couldn't load")

CMS-editor pages (`content/*`, `settings/{shop,theme,users,tenants,media}`, the `…/[id]` editors)
read through `editorConvexBridge`, which mints a Convex **operator token** signed with
`CONVEX_AUTH_PRIVATE_KEY`. Home and Products keep working because they read via the server-secret
`Shop.findByDomain` seam and never mint an operator token — so the symptom is "only certain pages".

- **Cause:** `CONVEX_AUTH_PRIVATE_KEY` is unset (or doesn't match the deployment's JWKS). The mint
    returns `null` and the bridge throws `ConvexOperatorTokenMintError`.
- **Fix:** set `CONVEX_AUTH_PRIVATE_KEY` to the RS256 PKCS8 key whose public half is served at
    `CONVEX_AUTH_JWKS_URL` — the **same** key the deployed admin/storefront use (copy from your secret
    store; don't generate a fresh one, or the deployment won't trust the tokens). Restart `pnpm dev`.
- The `[domain]/error.tsx` boundary now names this cause in the dev overlay and server logs instead
    of showing a blank server error.

### Opening any shop bounces back to the shop picker

- **Cause:** a valid NextAuth JWT that outlived its platform `users` document — typically the Convex
    deployment was reseeded (e.g. to the canonical test fixtures), wiping real users while the browser
    kept its session. `getAuthedCmsCtx` can't resolve the user, redirects to `/auth/login/`, and the
    login page (for a provisioned session) would send you back to `/`.
- **Fix:** **sign out and sign back in.** The auth adapter re-provisions the `users` doc on the next
    OAuth round-trip. The login page now falls through to the sign-in button for an unprovisioned
    session instead of looping to the picker, so re-auth is reachable.

## Layout

```text
apps/admin/
├── src/
│   ├── proxy.ts                 # NextAuth-based auth gate (Next 16's renamed middleware convention)
│   ├── instrumentation.ts       # OpenTelemetry bootstrap
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Shop overview (post sign-in)
│   │   ├── (auth)/              # Sign-in / sign-out
│   │   ├── (dashboard)/         # Per-shop dashboard (/[domain]/…)
│   │   │   └── [domain]/        # Shop-scoped routes
│   │   ├── (setup)/             # New-shop onboarding flow
│   │   ├── (user)/              # User account / settings
│   │   ├── api/                 # Server endpoints (auth, integrations)
│   │   ├── integrations/
│   │   │   └── shopify/         # Shopify OAuth callback + embed flow
│   │   ├── manifest.ts          # Web App Manifest
│   │   ├── not-found.tsx        # 404
│   │   └── globals.css
│   ├── components/              # React components
│   ├── utils/                   # auth.config, fetchers, domains, ...
│   └── @types/                  # Module declarations
├── next.config.js
└── package.json
```

## Routing

Authentication is enforced in `src/proxy.ts` with NextAuth — every route except
static assets and Next internals goes through it. Unauthenticated requests are
redirected to `/auth/login/`. (Renamed from `middleware.ts` per Next 16; the
file convention changed but the API is identical.)

The post-auth landing is `/` (the **Overview** in `app/page.tsx`), which lists the
shops the signed-in user can administer. From there:

| Route group         | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `(auth)`            | Sign-in / sign-out flows.                                     |
| `(dashboard)/[domain]` | Per-shop dashboard — content, products, settings, etc.     |
| `(setup)/new`       | New-shop onboarding wizard.                                   |
| `(user)/accounts`   | Personal account / profile settings.                          |
| `integrations/shopify` | Shopify OAuth callback + embed app surface.                |
| `api/*`             | Auth callbacks, integration endpoints.                        |

Route groups in parentheses (`(auth)`, `(dashboard)`, …) share layouts but don't
contribute path segments.

## Data access

Shop and user data is read through `@nordcom/commerce-db`. Sensitive fields
(`collaborators`, provider tokens) are projected out by default and must be opted into
with `{ sensitiveData: true }` only on the server.

```ts
import { Shop, User } from '@nordcom/commerce-db';

const shops = await Shop.findByCollaborator({ collaboratorId: user.id });
```

## Shopify integration

`@shopify/shopify-api` is used for the Admin API and OAuth handshake. The embed app
manifest scope and metadata base are derived from `ADMIN_DOMAIN` so a single
deployment can be embedded in any merchant's Shopify admin.

## Scripts

```bash
pnpm dev              # Next.js dev server — https://admin.localhost (Turbopack)
pnpm build            # Production build (Turbopack)
pnpm start            # Run the built server ($PORT)
pnpm lint             # biome lint .
pnpm typecheck        # tsc -noEmit
pnpm test:e2e         # Playwright E2E suite
pnpm clean            # Remove .next, dist, .turbo, coverage, node_modules
```

Unit tests are run from the repo root with Vitest (`pnpm test`). This project's
vitest environment is `happy-dom`.

## Conventions

-   **Sensitive data:** `Shop`/`User` queries omit `collaborators` and tokens by default.
    Pass `{ sensitiveData: true }` only on the server, and never expose the result to
    client components.
-   **`console`:** only `warn` / `error` / `info` / `debug` pass lint. No raw `console.log`.
-   **Trailing slashes:** `trailingSlash: true` — internal links should include the slash.

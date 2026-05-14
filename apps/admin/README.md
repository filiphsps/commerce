# `@nordcom/commerce-admin`

The operator / merchant dashboard. A Next.js 16 app where shop owners and Nordcom
operators authenticate, list and manage their shops, and configure integrations
(Shopify primarily).

This is the back-office surface. The customer-facing storefront lives in
[`apps/storefront`](../storefront); the marketing site is [`apps/landing`](../landing).

## Stack

-   **Framework:** Next.js 16 (App Router, Turbopack), React 19
-   **Auth:** NextAuth v5 (`@auth/core`) with GitHub provider
-   **Data:** `@nordcom/commerce-db` for shops and users (Mongo / Mongoose)
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
# → http://localhost:3000
```

Required environment variables (defined at the root in [`.env.example`](../../.env.example)):

| Variable                | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `MONGODB_URI`           | Shop / user data. Module-load failure if missing.             |
| `AUTH_SECRET`           | NextAuth signing secret.                                      |
| `AUTH_TRUST_HOST`       | Set to `true` for local development.                          |
| `ADMIN_DOMAIN`          | Hostname for the admin (e.g. `admin.example.com`).            |
| `LANDING_DOMAIN`        | Hostname for the marketing site; used for assets and redirects. |
| `GITHUB_ID` / `GITHUB_TOKEN` | GitHub OAuth credentials for sign-in.                    |
| `SHOPIFY_API_KEY`       | Required for the Shopify Admin API integration flow.          |
| `SHOPIFY_API_SECRET_KEY`| Pairs with `SHOPIFY_API_KEY`.                                 |

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
pnpm dev              # Next.js dev server on :3000
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

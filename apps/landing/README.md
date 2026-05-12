# `@nordcom/commerce-landing`

The marketing and documentation site. A Next.js 16 app that serves the public
Nordcom Commerce homepage, product pages, changelog, news, and Markdoc-driven docs.

This is the marketing surface. The customer-facing storefront lives in
[`apps/storefront`](../storefront); the operator dashboard is [`apps/admin`](../admin).

## Stack

-   **Framework:** Next.js 16 (App Router, Turbopack), React 19
-   **Content:** [Markdoc](https://markdoc.dev) via `@markdoc/markdoc` and
    `@markdoc/next.js`, plus `gray-matter` for front-matter
-   **UI:** [Nordstar](https://www.npmjs.com/package/@nordcom/nordstar), Tailwind CSS 4,
    SCSS modules, Geist font, `react-icons` / `lucide-react`
-   **Observability:** OpenTelemetry, Vercel Toolbar
-   **Shared:** [`@nordcom/commerce-marketing-common`](../../packages/marketing-common)
    for the Nordstar theme, [`@nordcom/commerce-errors`](../../packages/errors)
    for the typed error hierarchy

> Note: this app does **not** depend on `@nordcom/commerce-db`. It has no database
> connection of its own and can be developed standalone.

## Quick start

From the repo root:

```bash
pnpm install
pnpm build:packages

pnpm dev:landing
# → http://localhost:3001
```

This app has no required environment variables for local dev, but the following are
useful in production:

| Variable                | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `LANDING_DOMAIN`        | Canonical hostname; used by other apps for assets and post sign-in redirects. |
| `SENTRY_AUTH_TOKEN`     | Source-map uploads at build time.                 |

## Layout

```text
apps/landing/
├── src/
│   ├── proxy.ts                 # Next.js middleware (delegates /admin → admin)
│   ├── instrumentation.ts       # OpenTelemetry bootstrap
│   ├── middleware/              # Per-area middleware
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx         # Homepage
│   │   │   ├── docs/            # Markdoc-rendered documentation
│   │   │   ├── changelog/       # Release notes
│   │   │   └── news/            # Posts / announcements
│   │   └── (status)/
│   │       └── status/          # Hosted status pages (e.g. unknown-shop)
│   ├── markdoc/
│   │   ├── components.tsx       # Custom Markdoc component renderers
│   │   ├── config.ts            # Schema (nodes + tags)
│   │   ├── nodes.ts             # Markdoc node overrides
│   │   └── tags.ts              # Markdoc custom tags
│   ├── components/              # React components
│   ├── scss/                    # Global styles
│   └── utils/
├── next.config.js
└── package.json
```

## Routing

The middleware (`src/proxy.ts`) is minimal — it forwards any request prefixed with
`/admin` to the admin middleware (the same logic the storefront uses), so the landing
deployment can host both the public site and the admin under one domain if needed.

Route groups:

| Route group   | Purpose                                                              |
| ------------- | -------------------------------------------------------------------- |
| `(marketing)` | The public marketing surface (home, docs, changelog, news).          |
| `(status)`    | Hosted status pages — e.g. the `/status/unknown-shop/` page that the storefront rewrites unknown hosts to. |

## Markdoc

Docs and long-form content live under `src/app/(marketing)/docs/` (and elsewhere) as
`.md` / `.mdoc` files. The schema is configured in `src/markdoc/`:

-   `config.ts` — combines `nodes.ts` and `tags.ts` into a single Markdoc config.
-   `nodes.ts` — overrides for built-in nodes (headings, code blocks, etc.).
-   `tags.ts` — custom block-level tags (`{% callout %}`, etc.).
-   `components.tsx` — React renderers for the nodes/tags above.

To add a new custom tag, register it in `tags.ts`, then provide a renderer in
`components.tsx`.

## Scripts

```bash
pnpm dev              # Next.js dev server on :3001 (Turbopack)
pnpm build            # Production build (Turbopack)
pnpm start            # Run the built server ($PORT)
pnpm lint             # biome lint .
pnpm typecheck        # tsc -noEmit
pnpm clean            # Remove .next, dist, .turbo, coverage, node_modules
```

Unit tests are run from the repo root with Vitest (`pnpm test`). The vitest
environment is `happy-dom`.

## Conventions

-   **`console`:** only `warn` / `error` / `info` / `debug` pass lint. No raw `console.log`.
-   **Trailing slashes:** `trailingSlash: true` — internal links should include the slash.
-   **No DB:** if you find yourself reaching for `@nordcom/commerce-db` here, the content
    probably belongs in the admin or storefront instead.

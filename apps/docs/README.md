# @nordcom/commerce-docs

Next.js 16 + Nextra 4 docs site. Static export. Supports two deployment shapes:

## GH Pages (current canonical)

CI builds with `NEXT_PUBLIC_DOCS_BASE_PATH=/commerce` and `NEXT_PUBLIC_DOCS_CANONICAL_URL=https://filiphsps.github.io/commerce`. Output at `apps/docs/out` is uploaded by `actions/deploy-pages`.

## Vercel — own subdomain (e.g. `docs.nordcom.io`)

Set Vercel project env vars:

- `NEXT_PUBLIC_DOCS_BASE_PATH` = (empty)
- `NEXT_PUBLIC_DOCS_CANONICAL_URL` = `https://docs.nordcom.io`

Set Output directory to `out`, Framework to "Next.js".

## Vercel — microfrontend at `/docs` of the parent site (e.g. `nordcom.io/docs`)

Set Vercel project env vars on the docs deployment:

- `NEXT_PUBLIC_DOCS_BASE_PATH` = `/docs`
- `NEXT_PUBLIC_DOCS_CANONICAL_URL` = `https://nordcom.io/docs`

On the parent Next.js project (`nordcom.io`), add a rewrite:

```js
async rewrites() {
    return [
        { source: '/docs', destination: `${DOCS_DEPLOYMENT_URL}/docs` },
        { source: '/docs/:path*', destination: `${DOCS_DEPLOYMENT_URL}/docs/:path*` },
    ];
}
```

## Local dev

`pnpm --filter @nordcom/commerce-docs dev` runs at `localhost:3002` with no basePath. Pre-build scripts watch in parallel.

## How the build pipeline works

1. `pnpm --filter @nordcom/commerce-docs pre:typedoc` — emits per-subpath JSON to `.typedoc-out/`
2. `pnpm --filter @nordcom/commerce-docs pre:mirror` — hardlinks workspace `docs/` into `app/docs/(generated)/`
3. `pnpm --filter @nordcom/commerce-docs pre:page-map` — synthesizes stub pages + emits `_meta.json` + `lib/page-map.generated.ts`
4. `next build` — compiles
5. `pagefind` — emits static search index under `out${BASE_PATH}/_pagefind/`

Run all five with `pnpm --filter @nordcom/commerce-docs build`.

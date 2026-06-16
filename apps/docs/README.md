# @nordcom/commerce-docs

Next.js 16 + Nextra 4 docs site. Static export. Supports three deployment shapes:

## GH Pages (current canonical)

CI builds with `NEXT_PUBLIC_DOCS_BASE_PATH=/commerce` and `NEXT_PUBLIC_DOCS_CANONICAL_URL=https://nordcom.store/docs`. Output at `apps/docs/out` is uploaded by `actions/deploy-pages`.

## Vercel — own subdomain (e.g. `docs.nordcom.io`)

Set Vercel project env vars:

- `NEXT_PUBLIC_DOCS_BASE_PATH` = (empty)
- `NEXT_PUBLIC_DOCS_CANONICAL_URL` = `https://docs.nordcom.io` _(optional — see "Vercel canonical fallback" below)_

Set Output directory to `out`, Framework to "Next.js".

## Vercel — microfrontend at `/docs` of the parent site (e.g. `nordcom.io/docs`)

Set Vercel project env vars on the docs deployment:

- `NEXT_PUBLIC_DOCS_BASE_PATH` = `/docs`
- `NEXT_PUBLIC_DOCS_CANONICAL_URL` = `https://nordcom.io/docs` _(optional — see "Vercel canonical fallback" below)_

On the parent Next.js project (`nordcom.io`), add a rewrite:

```js
async rewrites() {
    return [
        { source: '/docs', destination: `${DOCS_DEPLOYMENT_URL}/docs` },
        { source: '/docs/:path*', destination: `${DOCS_DEPLOYMENT_URL}/docs/:path*` },
    ];
}
```

## Vercel canonical fallback

`NEXT_PUBLIC_DOCS_CANONICAL_URL` is **not required** on Vercel. When unset, `resolveDocsEnv` derives the canonical from Vercel's system env vars:

- Production deployments (`VERCEL_ENV=production`): uses `VERCEL_PROJECT_PRODUCTION_URL`, falling back to `VERCEL_URL`.
- Preview deployments (`VERCEL_ENV=preview`): uses `VERCEL_BRANCH_URL` (stable per-branch), falling back to `VERCEL_URL`.

`NEXT_PUBLIC_DOCS_BASE_PATH` (if set) is appended to the derived host. Setting `NEXT_PUBLIC_DOCS_CANONICAL_URL` explicitly always overrides the fallback — required for non-Vercel production builds (e.g. GH Pages).

## Local dev

`pnpm --filter @nordcom/commerce-docs dev` runs at `https://docs.localhost` (via portless). The dev script:

1. Runs `pnpm pre` once (typedoc + mirror + page-map — ~20-25s cold).
2. Boots `next dev` and the docs watcher in parallel.

The watcher only re-runs **mirror + page-map** on `.md(x)` changes under any workspace's `docs/` directory. Edits to existing files are picked up live via hardlinks; the watcher only fires on add/delete/rename. TypeDoc is **not** auto-rebuilt — re-run `pnpm pre:typedoc` (or `pnpm pre`) after API surface changes.

## How the build pipeline works

1. `pnpm --filter @nordcom/commerce-docs pre:typedoc` — emits per-subpath JSON to `.typedoc-out/`
2. `pnpm --filter @nordcom/commerce-docs pre:mirror` — hardlinks workspace `docs/` into `app/docs/(generated)/`
3. `pnpm --filter @nordcom/commerce-docs pre:page-map` — synthesizes stub pages + emits `_meta.json` + `lib/page-map.generated.ts`
4. `next build` — compiles
5. `pagefind` — emits static search index under `out${BASE_PATH}/_pagefind/`

Run all five with `pnpm --filter @nordcom/commerce-docs build`.

# Research: Scaling Next.js multi-tenant prebuild to 100k+ tenants

**Date:** 2026-06-01
**Branch:** `worktree-research+multitenant-build-cache` (based on `origin/master`)
**Goal:** **Prebuild as MUCH as possible** (max static HTML+RSC for SEO/cold-start), but **persist build + ISR/data cache between deployments** so a new deploy reuses prior rendered output and only re-renders what actually changed.
**Method:** three deep-research passes (≈310 verification agents), then a **live-doc verification pass** using the `next-best-practices` + `vercel-react-best-practices` skills and the next-devtools `nextjs_docs` MCP against Next.js v16.2.6 (lastUpdated 2026-05-31). Verification corrected the adapter/build-time claims (see Lever C note).

### Fixed constraints (non-options)

- ✅ **Vercel is the primary deploy target — but NO Vercel lock-in.** The solution must rest on **portable Next.js primitives** so we could *hypothetically self-host*. Vercel-exclusive mechanisms (proprietary Build Output API carry-forward) are out as the *foundation*; fine only as a transparent optimization over a portable base.
- ❌ **On-demand-only (don't prebuild) is NOT the primary strategy.** We want maximum prebuilt coverage. `dynamicParams` rendering is retained only as the fallback for brand-new shops and tenants beyond the prebuild budget.

---

## The honest landscape (read first)

After three research passes, the line between **supported** and **hack** is sharp:

| Capability | Status | Portable? |
|---|---|---|
| Persist **runtime ISR/data cache** across deploys (singular `cacheHandler` → Redis/S3) | ✅ **Supported, production-proven** (OpenNext, @fortedigital) | ✅ yes |
| **Layout/tenant separation** to shrink the per-tenant render surface | ✅ Supported (layouts, route groups, PPR, `use cache` donut) | ✅ yes |
| Cross-tenant reuse of a shared shell **within one build** (`use cache` donut) | ✅ Supported | ✅ yes |
| **Custom adapter** persists + **resumes** prerender shell/`postponedState` across instances/deploys | ✅ **Officially documented** (`NextAdapter.onBuildComplete` + `requestMeta.onCacheEntryV2`) | ✅ yes |
| **Build-time differential** — re-emit a *prior build's* prerenders into a *new build* to skip rendering unchanged tenants | ❌ **Not supported** — push this need to the runtime cache (adapter) instead | n/a |
| Durable **`use cache` / Cache Components** backend (plural `cacheHandlers`) | ❌ **No production self-hosted backend exists yet** | ❌ not yet |
| **Build-phase chunking** (`--experimental-build-mode compile\|generate`) | ⚠️ **Experimental** — validate before relying | ✅ yes |

**The key reframe:** Next.js has **no supported "skip re-rendering unchanged pages *at build time*"** mechanism. The supported way to "only rebuild what changed" is to **shift rendering to a durable runtime cache that survives deploys** — and Next.js now gives you a **first-class adapter API** (`onBuildComplete` to seed the cache, `requestMeta.onCacheEntryV2` to keep it fresh, `postponedState` to resume PPR) to do exactly that portably. Prebuild a subset, persist + resume the rest from the durable cache, regenerate individual tenants via `revalidateTag`. That's the OpenNext model, now an official integration surface — and it works on Vercel too.

---

## Lever A (PRIMARY, supported, portable) — persist the runtime ISR/data cache across deploys

This is the realistic answer to "keep build/ISR data between deployments."

### How

By default the ISR/data cache is **local filesystem per instance, not shared, lost on redeploy**. Replace it with a durable shared backend via the **singular `cacheHandler`** config:

```js
// next.config.js  — portable, runs on Vercel and self-hosted
module.exports = {
  cacheHandler: process.env.NODE_ENV === 'production'
    ? require.resolve('./cache-handler.mjs')
    : undefined,
  cacheMaxMemorySize: 0, // disable in-memory LRU, defer to the shared backend
};
```

- The singular `cacheHandler` handles **ISR pages, route-handler responses, and optimized images**. Methods: `get` / `set` / `revalidateTag` (`resetRequestCache` optional).
- ⚠️ It is **explicitly NOT used by `use cache` directives** — those go through the plural `cacheHandlers` (see Lever C / the tension below).
- Library: **`@fortedigital/nextjs-cache-handler`** (maintained fork of `@neshca/cache-handler`) — Redis (`redis-strings`), composite multi-backend, local-LRU fallback. Next 16 → v3.x.

### Cross-deploy seeding without clobbering live data

`registerInitialCache` (in `instrumentation.ts` `register()`) seeds the durable backend at startup from **the build's prerendered pages/routes/fetch calls** — necessary because Next writes prerenders to disk in a way that **bypasses the CacheHandler**:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerInitialCache } = await import('@fortedigital/nextjs-cache-handler/instrumentation');
    const CacheHandler = (await import('./cache-handler.mjs')).default;
    await registerInitialCache(CacheHandler, { setOnlyIfNotExists: true }); // ← preserve fresher runtime entries
  }
}
```

`setOnlyIfNotExists: true` writes only absent keys → a new deploy **warms shared cache without overwriting entries written at runtime by another instance**. This is how prior rendered output is preserved across a deploy.

> ⚠️ **Important nuance:** `registerInitialCache` seeds from **THIS build's artifacts**, not a prior deploy's output. It warms a shared backend; it does **not** make `next build` skip re-rendering. The cross-deploy *reuse* comes from the **durable backend persisting entries that aren't re-seeded** (the `setOnlyIfNotExists` guard keeps them).

### The proven off-Vercel reference: OpenNext

OpenNext is the canonical portable implementation and validates the whole approach:

- Auto-overrides Next's filesystem cache (standalone background revalidation fails in serverless) and stores **ISR/SSG + fetch cache on S3**.
- Cache files in `.open-next/cache` keyed by **`BUILD_ID`** (ISR/SSG under `BUILD_ID`, fetch under `__fetch/BUILD_ID`).
- `IncrementalCache` override runs **at runtime only, not build time** → to reuse prebuilt routes across deploys you **upload the prebuilt cache to the durable backend yourself**.
- On-demand revalidation updates S3, but the **CDN must be invalidated separately**.

> **Cross-deploy key nuance:** OpenNext namespaces cache by `BUILD_ID`. A changing build ID **orphans** the prior cache. To reuse across deploys you must either **pin the build ID** (`generateBuildId` → stable `CACHE_EPOCH`) or migrate/upload entries into the new namespace. Pin deliberately; bump to force a clean slate.

### A-Vercel (managed) — layer this ON TOP of the generic path when deployed on Vercel

On Vercel you do **not** configure a custom `cacheHandler` — Vercel **manages the durable cache automatically**, and crucially provides the **`use cache: remote` / plural `cacheHandlers` backend that self-hosting lacks** (see the tension section). So on Vercel, Lever B's `use cache` donut **is durably cached out of the box** — the gap that blocks portable self-hosted `use cache` does not exist here.

Same app code, backend selected by environment:

```js
// next.config.js — generic + Vercel coexist
const onVercel = !!process.env.VERCEL;
module.exports = {
  // On Vercel: omit cacheHandler → Vercel's managed durable cache + use cache: remote backend.
  // Self-hosted: route ISR/data cache to shared Redis/S3.
  cacheHandler: onVercel
    ? undefined
    : process.env.NODE_ENV === 'production' ? require.resolve('./cache-handler.mjs') : undefined,
  cacheMaxMemorySize: onVercel ? undefined : 0,
};
```

What Vercel gives you natively:
- **Durable ISR cache** — generated content persists **31 days, or until you `revalidate`** it; lives alongside the Function region; independent of the CDN edge cache. On-demand `revalidateTag(tenantId)` regenerates a single tenant.
- **`use cache: remote` backend** provided automatically (no config) → Cache Components durability works on Vercel today.
- **Selective pre-rendering** — prebuild popular pages, generate the rest on first request; the managed equivalent of our subset-prebuild + `dynamicParams` plan.
- **Skew Protection** — keeps a deployment's assets/functions consistent during rollouts, avoiding version mismatch between client and server across a deploy. **Portable equivalent:** the `deploymentId` config (used for version skew protection + cache busting) works off-Vercel too — set it from the same `CACHE_EPOCH`/git ref you pin `generateBuildId` with.

⚠️ **Critical Vercel caveat (why you still want the generic layer):** **"each new deployment uses its own ISR cache and does NOT reuse the cache from a previous deployment"** — old caches are retained only for instant rollback, never reused. So on Vercel a code deploy still re-incurs first-render cost per tenant; cross-deploy *reuse* is NOT free even on Vercel.

How to bridge it on Vercel (in addition to the managed cache):
- **Don't rely on build-time prebuild surviving the deploy** — it won't. Rely on **on-demand regeneration after deploy** (selective pre-rendering) + per-tenant `revalidateTag` so only changed tenants regenerate, and the long-lived (31-day) ISR cache keeps the rest warm within the deployment.
- **For true cross-deploy carry-forward on Vercel**, the only managed lever is the **Build Output API v3 Prerender `fallback`** (hand-author `.vercel/output`, carry prior HTML/RSC as the fallback file). This is **Vercel-proprietary** → keep it strictly as an *optional optimization on top of* the generic Redis/S3 layer, never the foundation.

> **Net:** On Vercel, the managed cache **removes the `use cache` portability blocker** (the donut is durable here) and gives a 31-day ISR cache + per-tenant revalidation — but its **per-deployment scoping** means the generic durable layer (or the Vercel-only Build Output API fallback hack) is still what bridges *across* deploys. Run both: generic Redis/S3 as the portable foundation, Vercel managed cache as the zero-config win where deployed there.

---

## Lever B (supported, portable) — separate shared layout layers from tenant code

Doesn't solve cross-deploy reuse by itself, but **shrinks the per-tenant render surface** so whatever you do rebuild/store per tenant is small and cheap. Highest structural-leverage step.

### Layout layering primitives

- **Layouts** = the primitive for shared chrome. They **persist across routes, do NOT re-render on client navigation, are cached on the client and reused.** Put nav / footer / theme shell / design system here. Layouts receive `params` (awaited promise, root→segment) for per-tenant keying.
- **Templates** remount with a unique key and reset child Client Component state → **wrong** for stable shared chrome. Reserve for surfaces that must remount.
- **Route groups** → multiple root layouts; opt specific segments into a shared layout while keeping others out. The file-convention mechanism to separate a maximal shared surface from tenant/section layers in `/[domain]/[locale]/…`. (Cross-root-layout nav = full reload — fine, cross-tenant nav is already a full document load.)
- **Soft navigation does partial rendering**: only the changed leaf segment re-renders; shared layouts and sibling parallel slots persist; prefetched RSC payloads are kept in memory keyed by segment. `staleTimes` does not change this.
- ⚠️ **Parallel-route slots can't mix static + dynamic at the same level** — if one slot is dynamic, all are. So don't model shared-shell-vs-tenant-hole as sibling slots; use the **PPR static-shell + Suspense-hole** model instead.

### The decisive lever: the `use cache` "donut"

With `cacheComponents: true`, **Partial Prerendering is the default**: a static shell (from `use cache` results + deterministic ops + Suspense fallbacks) is prebuilt; runtime/tenant-varying content (cookies, headers, searchParams, unsampled params) must be wrapped in `<Suspense>` and streams as dynamic holes.

The `use cache` **cache key = Build ID + Function ID + serializable arguments** (closures are auto-captured into the key by the compiler). Therefore:

- A cached segment with **NO tenant-varying props/closures** → **one cache HIT reused across ALL tenants** (the shared shell, design system, nav).
- Any segment that captures a tenant id → **distinct entry per tenant** (a miss per tenant) — the minimal per-tenant surface.

**Donut composition** is the highest-impact boundary: children / JSX slots / Server Actions passed *through* a `use cache` component are **pass-through references that do NOT affect its cache entry** (as long as the body doesn't introspect them). So a shared cached shell (the donut) wraps per-tenant children (the hole) filled at runtime — the shell is one cross-tenant HIT, only the children vary.

Per-tenant invalidation: `cacheTag('shop', tenantId)` inside the cached boundary, then `revalidateTag(tenantId)` purges **just that tenant** without touching others. (`cacheTag`/`cacheLife` require `cacheComponents`, can't be at module scope.)

Short-lived caches (zero revalidate / `<5min` / the `seconds` profile) are **auto-excluded from prerender → become dynamic holes** — useful for near-real-time per-tenant data while keeping the shell static.

**Architecture goal:** maximize the zero-tenant-input cached surface (shell, chrome, design system); isolate the uncacheable per-tenant surface into small `cacheTag(tenantId)` segments.

---

## ⚠️ The Cache Components tension (the crux)

Levers A and B pull in opposite directions on durability:

- **Lever B's `use cache` donut** gives the best cross-tenant reuse — *but only within a single build* (Build ID is in the key), and the plural **`cacheHandlers` backend for `use cache: remote` has NO production self-hosted implementation yet** (`@fortedigital` explicitly marks it "Not yet supported — Help needed"). On Vercel the backend is auto-provided; **self-hosted it does not exist today.**
- **Lever A's singular `cacheHandler`** is the durable, portable, cross-deploy layer — *but it does NOT cover `use cache`*; it only covers legacy ISR/fetch/route-handler/image cache.

**So you cannot today have both, portably:** the durable cross-deploy cache (singular `cacheHandler`) and the new `use cache`/Cache Components surface (plural `cacheHandlers`) are separate and **incompletely bridged off-Vercel.**

**Resolution for portability today:**
- Lean on **legacy ISR + `fetch` cache + singular `cacheHandler`** as the durable cross-deploy layer (Lever A). This is what persists across deploys on Vercel *and* self-hosted.
- Use **Lever B's layout separation + (optionally) `use cache` donut** to cut per-tenant cost **within each build**. On Vercel you also get durable `use cache: remote`; self-hosted you don't (yet) — so don't make cross-deploy persistence *depend* on `use cache` until a `cacheHandlers` backend lands (or we write one).

---

## Lever C — custom adapter (mostly SUPPORTED) + build-phase chunking (experimental)

> **Corrected after live-doc verification (next-devtools `nextjs_docs`, v16.2.6).** Earlier passes called this "unsupported hack." That was too pessimistic: the **adapter API is a first-class, officially documented platform-integration surface**, and Next.js explicitly documents persisting + resuming prerender output through it. What stays unsupported is narrower than first thought.

### C1 (SUPPORTED, portable) — custom adapter that persists & resumes prerender output

Next 16 ships a full **adapter API** (`adapterPath` / `NEXT_ADAPTER_PATH`; `nextjs/adapter-vercel` is the reference impl). The `NextAdapter` interface:

- **`async modifyConfig(config, context)`** — mutate config for any CLI command that loads `next.config.js` (`context.phase`, `context.nextVersion`).
- **`async onBuildComplete(context)`** — runs after build with `context.outputs` (all build outputs by type), `context.buildId`, `context.distDir`, `context.projectDir`, `context.config`, and `context.routing` (full routing table: `beforeFiles`/`afterFiles`/`dynamicRoutes`/`fallback`/`rsc`/…).

**Next.js officially documents the PPR persist-and-resume pattern** (`/adapters/implementing-ppr-in-an-adapter`):

1. **Seed at build** (`onBuildComplete`): for each `outputs.prerenders[]`, read `fallback.filePath` (the shell — HTML/JSON/RSC) + `fallback.postponedState` (serialized PPR resume state) + `initialHeaders`/`initialStatus`/`initialRevalidate`/`initialExpiration`, and write them to **your durable platform cache**.
2. **Serve + resume at runtime**: stream the cached shell first, then invoke the entrypoint with `handler(req, res, { requestMeta: { postponed: cachedEntry.postponedState, onCacheEntryV2 } })` — one HTTP response = `[shell bytes][resumed bytes]`.
3. **Keep cache fresh**: `requestMeta.onCacheEntryV2(cacheEntry, meta)` fires on every response-cache lookup/generation; persist the updated `html`/`postponed`/`headers`/`status`/`cacheControl` back to your platform cache. (`onCacheEntry` is deprecated → use `onCacheEntryV2`.)

**This is the sanctioned, portable (non-Vercel) way to make prerendered output durable and resumable across instances and deploys** — exactly the OpenNext-style architecture, now a first-class API. If your platform cache is external (Redis/S3) and you seed with set-only-if-absent semantics, **prior entries survive a deploy** = the cross-deploy reuse we want, owned by the adapter at the runtime layer.

### C2 (NOT supported) — true build-time differential (skip rendering unchanged tenants)

What is **still not sanctioned**: re-emitting a **prior build's** `outputs.prerenders` into a **new build** so `next build` skips rendering unchanged tenants. The docs describe single-build output + runtime persistence (C1), never a build-time merge of a previous build's assets. PPR `postponedState`/`immutableHash` portability across two builds is unverified. → If you want "don't re-render unchanged tenants," do it at the **runtime cache layer (C1)**, not by hacking the build.

### C3 (EXPERIMENTAL) — build-phase separation & chunking

- **`next build --experimental-build-mode [compile|generate]`** (default `default`) — the real primitive for splitting **compile** (bundle code, no render) from **generate** (render pages). This is what enables sharded/incremental generation (compile once; generate page subsets across workers/runs). **Experimental** — validate before relying on it.
- **`--experimental-app-only`** builds only App Router routes.
- ⚠️ **`--debug-build-paths="app/**/page.tsx"` is DEBUG-ONLY** — "Build only specific routes for debugging," grouped with `--debug-prerender` whose docs warn **"Do not deploy … to production."** Do **not** use it as a production chunking mechanism, despite the tempting name.
- **`turbopackFileSystemCache`** accelerates **compilation** across builds, not page-render reuse.
- **Official self-hosting "Build Cache" guidance remains only `generateBuildId`** for consistent IDs across containers.

> **Net:** the durable+resumable prerender cache (C1) is supported and portable — adopt it. True build-time differential (C2) stays unsupported — push that need to the runtime cache instead. Build sharding (C3) exists only behind experimental flags.

---

## Recommended architecture for our app (multi-tenant by hostname)

Portable, Vercel-primary, max prebuild, cross-deploy reuse — built on Levers A + B (+ C1 for PPR durability):

1. **Separate the surface (Lever B).** Shared chrome/design-system/nav → layouts + route groups (zero tenant inputs → cross-tenant cache HIT). Isolate per-tenant content into small segments. This minimizes per-tenant render+storage cost.
2. **Prebuild a subset.** `generateStaticParams` → changed/popular tenants (≥1 satisfies Cache Components). `dynamicParams = true` → new/overflow shops render on first visit (no redeploy for a new tenant — matches our hostname arch).
3. **Durable shared cache (Lever A).** Singular `cacheHandler` → Redis/S3 (`@fortedigital`, `cacheMaxMemorySize: 0`). This is the cross-deploy persistence layer; works on Vercel and self-hosted. **For PPR shell + `postponedState` durability/resume off-Vercel (Lever C1):** either adopt OpenNext (implements it) or write a custom adapter (`onBuildComplete` seeds, `requestMeta.onCacheEntryV2` refreshes).
4. **Seed across deploys.** `registerInitialCache` + `setOnlyIfNotExists` in `instrumentation.ts` → warm new build's pages without clobbering fresher runtime entries.
5. **Pin Build ID.** `generateBuildId` (stable `CACHE_EPOCH`) so the durable cache namespace survives deploys (OpenNext keys by `BUILD_ID`; a changing ID orphans it). Bump deliberately for a clean slate.
6. **Per-tenant invalidation.** `revalidateTag(tenantId)` regenerates only changed tenants → ties into our Convex→Next revalidation bridge (BRIDGE-04 idempotency). This is the "only rebuild what changed" mechanism — at the **tenant** granularity, at **runtime**, not at build time.
7. **Defer `use cache` cross-deploy dependence** until a portable `cacheHandlers` backend exists (or we build one). Use `use cache` donut for within-build cross-tenant reuse; let the singular `cacheHandler` own durability.

**Net:** full prebuilt coverage where it matters, per-tenant rendered output persists across deploys in shared Redis/S3, and only tenants whose data changed get regenerated (via `revalidateTag`). Build-time differential (skipping unchanged tenant *renders during `next build`*) stays a prototype track (Lever C), not a dependency.

---

## Decision flow

```
Shared render code changed?  ── yes ──► durable cache still valid? (pinned Build ID + immutableHash match)
        │ no                              │ no ──► full regenerate (bump CACHE_EPOCH)
        ▼                                 │ yes ─► shared shell HIT reused; only re-render tenant holes
Tenant data changed?  ── yes ──► revalidateTag(tenantId) ► regenerate that tenant only (runtime)
        │ no
        ▼
Serve from durable shared cache (Redis/S3) — survives the deploy, no re-render.
New/overflow tenant ► dynamicParams render on first visit ► written to durable cache.
```

---

## Open questions / gaps (need prototype validation)

1. **Custom adapter (C1) — should we build one?** The official `NextAdapter` PPR pattern (`onBuildComplete` seeds shell+`postponedState`; `requestMeta.onCacheEntryV2` keeps it fresh; resume via `requestMeta.postponed`) is the sanctioned portable durability+resume layer. Open: is writing our own adapter worth it vs. adopting OpenNext (which already implements this)? Prototype the seed→persist→resume loop against 16.2.6.
2. **Portable `use cache` durability:** when will a production `cacheHandlers` (plural) backend for `use cache: remote` exist self-hosted — or should we **write one** so Lever B's donut becomes cross-deploy durable off-Vercel? (Note: the adapter `onCacheEntryV2` path persists *prerender* output, but the plural `cacheHandlers` for `use cache` segments is still a separate, backend-less surface off-Vercel.)
3. **Build-phase chunking:** does `--experimental-build-mode compile|generate` reliably let us compile once and shard `generate` across workers/runs at 100k routes? Experimental — prototype + measure. (`--debug-build-paths` is debug-only, not a production lever.)
4. **`.next/cache` internals:** native structure + `prerender-manifest.json` mapping for a shared-volume Docker standalone setup (OpenNext's `.open-next/cache` layout is documented; native `.next/cache` is not).
5. **Cardinality at 100k:** Redis/S3 footprint and eviction for one entry per tenant; `registerInitialCache` / adapter seeding time on cold deploy.

## Caveats

- The durable-runtime-cache approach (Levers A+B) is **supported and production-proven** (OpenNext, @fortedigital). The build-time differential approach (Lever C) is **assembled from documented primitives but never sanctioned** — prototype before depending on it.
- Cache Components / `use cache` / plural `cacheHandlers` is a **young Next 16 API** with **no portable durable backend yet** — do not make cross-deploy persistence depend on it self-hosted.
- Findings are documentation/source-verified, not load-tested at literal 100k scale.

## Key sources (all primary)

**Cross-deploy cache persistence**
- Self-hosting (Build Cache, cacheHandler) — https://nextjs.org/docs/app/guides/self-hosting
- cacheHandler (singular) — https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath
- cacheHandlers (plural, `use cache`) — https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers
- @fortedigital/nextjs-cache-handler — https://github.com/fortedigital/nextjs-cache-handler
- next-shared-cache (@neshca) — https://caching-tools.github.io/next-shared-cache/
- cache-handler-redis example — https://github.com/vercel/next.js/tree/canary/examples/cache-handler-redis
- OpenNext caching — https://opennext.js.org/aws/inner_workings/caching · https://opennext.js.org/aws/config/overrides/incremental_cache · https://opennext.js.org/cloudflare/caching

**Adapter API & build** (verified live via next-devtools `nextjs_docs`, v16.2.6)
- Adapter API reference (`modifyConfig`/`onBuildComplete`) — https://nextjs.org/docs/app/api-reference/adapters/api-reference
- **Implementing PPR in an adapter** (seed `fallback`+`postponedState`, `onCacheEntryV2`) — https://nextjs.org/docs/app/api-reference/adapters/implementing-ppr-in-an-adapter
- Adapter output types — https://nextjs.org/docs/app/api-reference/adapters/output-types
- Adapter runtime integration — https://nextjs.org/docs/app/api-reference/adapters/runtime-integration
- adapterPath / configuration — https://nextjs.org/docs/app/api-reference/config/next-config-js/adapterPath · https://nextjs.org/docs/app/api-reference/adapters/configuration
- nextjs/adapter-vercel (reference) — https://github.com/nextjs/adapter-vercel
- next CLI (`--experimental-build-mode`, `--debug-build-paths` debug-only) — https://nextjs.org/docs/app/api-reference/cli/next
- generateBuildId — https://nextjs.org/docs/app/api-reference/config/next-config-js/generateBuildId
- deploymentId (portable skew protection) — https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId
- turbopackFileSystemCache — https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache
- Official multi-tenant guide (→ Vercel platforms starter) — https://nextjs.org/docs/app/guides/multi-tenant

**Layout / segment separation**
- Layout — https://nextjs.org/docs/app/api-reference/file-conventions/layout
- Template — https://nextjs.org/docs/app/api-reference/file-conventions/template
- Route groups — https://nextjs.org/docs/app/api-reference/file-conventions/route-groups
- Parallel routes — https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes
- Caching / Cache Components — https://nextjs.org/docs/app/getting-started/caching
- use cache — https://nextjs.org/docs/app/api-reference/directives/use-cache
- Composable caching (donut) — https://nextjs.org/blog/composable-caching
- cacheLife — https://nextjs.org/docs/app/api-reference/functions/cacheLife
- cacheTag — https://nextjs.org/docs/app/api-reference/functions/cacheTag
- Partial Prerendering — https://nextjs.org/docs/app/getting-started/partial-prerendering
- staleTimes — https://nextjs.org/docs/app/api-reference/config/next-config-js/staleTimes

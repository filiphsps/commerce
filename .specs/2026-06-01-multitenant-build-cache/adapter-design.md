# Design: custom Next.js 16 deployment adapter (OpenNext-based)

**Date:** 2026-06-01
**Depends on:** `research.md` (same dir)
**Goal:** build OUR OWN Next.js 16 deployment adapter — implementing the official `NextAdapter` interface — using **OpenNext as the architectural reference/base**, to support cross-deploy ISR/data + PPR cache persistence for a 100k+ tenant, hostname-routed app. **Vercel primary, portable (hypothetically self-hostable), extensible.**
**Sources:** official Next.js adapter docs (live-verified via `nextjs_docs`, v16.2.6) + OpenNext source/docs (deep-research, 23/25 claims verified). License: **both OpenNext packages are MIT** (AWS © SST 2022; Cloudflare © Cloudflare) → we may fork/vendor with attribution.

---

## 1. Key structural fact: an "adapter" is 3 layers, not 1

The official `NextAdapter` interface is **build-time only**. Runtime behavior lives in separate, official interfaces. A complete deployment integration = three cooperating pieces:

| Layer | Official surface | When | Our job |
|---|---|---|---|
| **A. Build adapter** | `NextAdapter` (`name`, `modifyConfig`, `onBuildComplete`) — `import type { NextAdapter } from 'next'` | build time | process `outputs`, upload assets, **seed durable cache**, emit routing |
| **B. Runtime cache** | `cacheHandler` (ISR/data) + `cacheHandlers` (`use cache`) | runtime | persist/serve cache to shared store across instances+deploys |
| **C. Runtime server wrapper** | entrypoint `handler(req, res, ctx)` + `requestMeta` | runtime | route by hostname, invoke entrypoints, PPR resume, propagate cache writes |

OpenNext predates the official adapter API and bundles all three into **one override system + its own `next build` wrapper**. **Our plan: keep OpenNext's runtime override *contracts* (layers B/C), but replace its build wrapper with the official `onBuildComplete` (layer A).**

---

## 2. The official build adapter (layer A)

```typescript
import type { NextAdapter } from 'next'

const adapter: NextAdapter = {
  name: 'commerce-adapter',
  async modifyConfig(config, { phase, nextVersion }) {
    // force cacheHandler/cacheHandlers, output:'standalone', pinned generateBuildId/deploymentId, etc.
    return config
  },
  async onBuildComplete({ outputs, routing, buildId, distDir, config, projectDir, repoRoot, nextVersion }) {
    // outputs.{pages,appPages,appRoutes,pagesApi,prerenders,staticFiles,middleware}
    // 1. upload outputs.staticFiles (immutableHash) to CDN/object store
    // 2. SEED durable cache from outputs.prerenders[]: fallback.filePath (HTML/RSC) + postponedState + initial{Revalidate,Expiration,Headers,Status}
    // 3. persist routing table (dynamicRoutes/beforeFiles/afterFiles/fallback/rsc) for the wrapper
    // 4. package the server bundle for our runtime target
  },
}
export default adapter
```

`onBuildComplete` gives us **exactly** the prerender carry-forward metadata (`outputs.prerenders[].fallback.filePath` + `postponedState` + `groupId`) — this is what the OpenNext "you must upload the prebuilt cache yourself" step did manually. Now it's a typed hook.

> **This closes the build-time→runtime gap natively.** OpenNext writes `.open-next/cache/<BUILD_ID>` to disk and relies on an out-of-band upload because its `IncrementalCache` runs only at runtime. Our `onBuildComplete` *is* the build-time hook — we push prerender shells + ISR seed straight into the durable store from here.

---

## 3. Runtime layers — port these OpenNext contracts ~1:1

### B1. `IncrementalCache` (ISR/SSG + fetch) → wire under `cacheHandler`

OpenNext contract (port directly):
```typescript
type CacheEntryType = 'cache' | 'fetch' | 'composable'
interface IncrementalCache {
  name: string
  get<T extends CacheEntryType = 'cache'>(key: string, type?: T): Promise<WithLastModified<CacheValue<T>> | null>
  set<T extends CacheEntryType = 'cache'>(key: string, value: CacheValue<T>, isFetch?: T): Promise<void>
  delete(key: string): Promise<void>
}
```
- Stored value is a discriminated `IncrementalCacheValue` union. The **`APP_PAGE` entry carries `postponed?: string` (PPR shell) and `segmentData?: Map<string,Buffer>` (per-segment RSC)** — so **PPR rides the incremental cache, not a separate mechanism.** Serialize/reconstruct both on set/get.
- Does **NOT** touch tags — that's the TagCache.
- Backend: Redis (hot) + object store (large bodies). On Vercel: Vercel's managed cache already does this (so our `cacheHandler` is the self-host/portable path; on Vercel we can omit it — see research `A-Vercel`).

### B2. `TagCache` → decision: **use `nextMode`, not `original`**

Two modes (discriminated union):
- **`original`**: `getByTag/getByPath/getLastModified/writeTags` — write-heavy, **requires build-time prepopulation of ALL tags**, enables automatic CDN invalidation. ❌ **Does not scale to 100k tenants** (prepopulate-all + write amplification).
- **`nextMode`**: `getLastRevalidated/hasBeenRevalidated/writeTags` (+ optional `getPathsByTags/isStale`) — minimal writes, **no prepopulation**, designed for the composable `use cache` handler. ✅ **Our choice.** Fresh/Stale/Expired model: a stale tag forces `revalidate=1` to trigger background regen.
- ⚠️ OpenNext's bundled `dynamodb-nextMode` is marked **TBA** — so we implement our own `nextMode` backend (Redis/Convex-backed) anyway. Per-tenant tag = `cacheTag(shopId)` → `revalidateTag(shopId)` purges one tenant.

### B3. `ComposableCacheHandler` (`use cache`) → wire under `cacheHandlers`

Separate interface from the incremental cache:
```typescript
interface ComposableCacheHandler {
  get(cacheKey): Promise<...>
  set(cacheKey, pendingEntry): Promise<void>
  refreshTags(): Promise<void>
  getExpiration(...tags: string[] | string[][]): Promise<...>   // arrays in Next 16
  updateTags(...): Promise<void>                                 // added in Next 16
  receiveExpiredTags(...): Promise<void>
}
```
This is **the gap noted in research** (no production self-hosted `cacheHandlers` backend exists). OpenNext has the interface + a working impl — **this is the single highest-value thing to port**, because it makes Lever B's `use cache` donut cross-deploy durable off-Vercel. Stored as `CacheEntryType='composable'`.

### C. Server wrapper + converter → port `Wrapper`/`Converter`, wire to official `requestMeta`

OpenNext `Wrapper`/`Converter` adapt platform req/res ↔ Next's internal event. Map onto the official entrypoint call:
```typescript
await handler(req, res, {
  waitUntil,                          // keep function alive for background revalidation
  requestMeta: {
    hostname: tenantHostname,         // ← MULTI-TENANT: official hostname injection
    postponed: cached?.postponedState,// ← PPR resume (POST + pprChain.headers {'next-resume':'1'})
    onCacheEntryV2: async (entry, meta) => { /* propagate cache write to shared store */ return false },
    revalidate, render404, relativeProjectDir,
  },
})
```
- **`requestMeta.hostname`** is the official, first-class hook for our hostname→tenant resolution. No middleware hack needed at the wrapper layer.
- **`onCacheEntryV2`** fires on every cache lookup/generation → propagate to shared storage (multi-instance coordination). Replaces guessing; `onCacheEntry` is deprecated.
- **PPR resume**: detect PPR route w/ cached shell → set `pprChain.headers` → POST `postponedState` as body → handler renders only deferred Suspense, streams. Response = `[shell][resumed]`.

---

## 4. Reuse vs reimplement matrix

| Component | Action | Why |
|---|---|---|
| `IncrementalCache` interface + APP_PAGE/PPR serialization | **Reuse (vendor)** | ports 1:1; PPR `postponed`+`segmentData` handling is non-trivial |
| `ComposableCacheHandler` (`use cache`) | **Reuse (vendor)** | fills the off-Vercel `cacheHandlers` gap; highest value |
| `TagCache` `nextMode` contract | **Reuse contract, reimplement backend** | bundled `dynamodb-nextMode` is TBA; we back with Redis/Convex |
| `Wrapper`/`Converter`/`Queue`/`CDNInvalidation` contracts | **Reuse (vendor)** | small typed contracts, runtime-agnostic |
| `open-next.config.ts` lazy-override registry pattern | **Reuse the pattern** | clean extensibility model (`name: () => import('./x').then(m=>m.default)`) |
| **Build wrapper** (`.open-next/` producer, esbuild config compile) | **Reimplement** on official `onBuildComplete` | OpenNext doesn't use the official adapter API yet; we want the typed `outputs` |
| BUILD_ID cache namespacing | **Reimplement (fix)** | see §5 — OpenNext namespaces by BUILD_ID → breaks cross-deploy reuse |
| AWS/Cloudflare backend impls (S3/DynamoDB/R2) | **Don't port** | we target Vercel + our own store (Redis/Convex/object store) |

**Rank by portability to our adapter:** (1) IncrementalCache, (2) ComposableCacheHandler, (3) TagCache nextMode, (4) Wrapper/Converter, (5) Queue/CDNInvalidation, (6) build pipeline (reimplement), (7) cloud backends (skip).

---

## 5. Cross-deploy reuse — the BUILD_ID problem (and our fix)

OpenNext namespaces cache keys by `BUILD_ID` (`.open-next/cache/<BUILD_ID>`, DynamoDB partition key `${BUILD_ID}/${tag}`). **A new BUILD_ID cannot match prior-deploy entries → warm cache is NOT reused across deploys.** That directly defeats our goal.

**Our fix (the whole point of building our own):**
1. **Pin the cache namespace to a content epoch, not the build hash.** Use `generateBuildId`/`deploymentId` = a stable `CACHE_EPOCH` that only changes when shared render code changes (the `templateVersion` from `research.md`). Data-only deploys keep the same namespace → prior entries reused.
2. **Seed with set-only-if-absent** in `onBuildComplete` so a deploy warms new/changed tenants without clobbering fresher runtime entries (OpenNext's `setOnlyIfNotExists` semantics, applied at the official build hook).
3. **Per-tenant invalidation** via `nextMode` `writeTags` + `revalidateTag(shopId)` — only changed tenants go stale; everything else stays warm across the deploy.
4. **CDN invalidation** on on-demand revalidation is separate (OpenNext requires explicit CloudFront invalidation). On Vercel the managed CDN handles this; for portability our `CDNInvalidation` override invalidates only the changed tenant paths.

Result: deploy render cost ∝ changed tenants, not 100k — achieved at the **runtime durable cache** layer (the supported path), seeded by the **build adapter** (official hook).

---

## 6. Multi-tenant at 100k — specific decisions

- **Hostname routing:** `requestMeta.hostname` in the wrapper; our existing middleware hostname→shop logic moves behind it. Tenant context stays explicit (matches CLAUDE.md "tenant context never implicit").
- **Tag cardinality:** `nextMode` (no prepopulation) — avoids `original` mode's prepopulate-all-tags blowup. One `cacheTag(shopId)` per tenant. Watch partition hot-keys (open question).
- **Cache surface minimization:** apply `research.md` Lever B — shared `use cache` donut shell (zero tenant inputs) = one entry across all tenants; only tenant leaves are per-`shopId` entries. Keeps 100k-tenant cache cardinality to small per-tenant leaves, not full pages.
- **Convex integration:** `revalidateTag(shopId)` is driven by our Convex→Next revalidation bridge (BRIDGE-04 idempotency layer) — the TagCache `nextMode` backend can be Convex-backed, unifying tenant data + revalidation state.

---

## 7. Build pipeline

- **Reimplement** OpenNext's `.open-next/` producer against `onBuildComplete(outputs)`. We get typed `outputs.{staticFiles,prerenders,appPages,...}` instead of scraping `.next/standalone`.
- Keep `output: 'standalone'` (set via `modifyConfig`) for the server bundle base.
- Optionally adopt `--experimental-build-mode compile|generate` later to shard `generate` (research Lever C3) — out of scope for v1.
- ⚠️ Do **not** use `--debug-build-paths` (debug-only).

---

## 8. Testing — prove "supports everything we need"

Use the **official adapter compat harness**: set `NEXT_ADAPTER_PATH`, provide `e2e-deploy.sh` / `e2e-logs.sh` / `e2e-cleanup.sh` (emit `BUILD_ID:` / `DEPLOYMENT_ID:` / `IMMUTABLE_ASSET_TOKEN:` markers), run Next's own e2e deploy suite (`NEXT_TEST_MODE=deploy`, sharded). Passing it = feature-complete against Next's expectations. Wire into CI as a gated workflow.

---

## 9. Proposed phasing

1. **v0 — minimal build adapter:** `NextAdapter` that uploads static assets + emits routing; runtime = plain `next start`. Pass a slice of the compat harness.
2. **v1 — durable ISR + PPR:** port `IncrementalCache` (with APP_PAGE/`postponed`/`segmentData`); seed from `onBuildComplete`; wrapper with `requestMeta.hostname` + PPR resume + `onCacheEntryV2`. Pinned `CACHE_EPOCH` namespacing.
3. **v2 — `use cache` durability:** port `ComposableCacheHandler` under `cacheHandlers`; `nextMode` TagCache (Convex/Redis backend) + `revalidateTag(shopId)` wired to BRIDGE-04.
4. **v3 — extensibility + scale:** lazy-override registry, CDN invalidation override, 100k load test (cardinality/throughput), optional build sharding.

---

## 10. Open questions / risks

1. **`onCacheEntryV2`/`postponedState` wiring stability** — is it Next-version-coupled enough to need per-minor maintenance? Prototype against 16.2.6; pin Next minor.
2. **Vercel vs portable runtime split** — on Vercel layers B/C are largely managed; confirm our `cacheHandler`/wrapper coexist cleanly with Vercel's managed cache (env-gated, per research `A-Vercel`) or whether Vercel ignores custom `cacheHandler`.
3. **100k partition hot-keys / throughput** — DynamoDB-style hot partitions from tag namespacing; pick a backend (Convex? Redis Cluster?) that shards tenant tags well. No verified scale data — load-test.
4. **`use cache` cross-deploy key** — Build ID is in the `use cache` key (research); confirm pinned `CACHE_EPOCH` + our `ComposableCacheHandler` actually yields cross-deploy hits at build time.
5. **Vendor vs clean-room** — vendor OpenNext's MIT override types directly (fast, attribution) vs clean-room reimplement (no dependency drift). Lean **vendor the type contracts, reimplement backends.**

## Sources

**Official adapter API** (live-verified, v16.2.6): `/adapters/creating-an-adapter` (NextAdapter + AdapterOutputs), `/adapters/api-reference` (modifyConfig/onBuildComplete), `/adapters/runtime-integration` (cacheHandler vs cacheHandlers split, onCacheEntryV2), `/adapters/invoking-entrypoints` (handler ctx, requestMeta.hostname, edge `_ENTRIES`), `/adapters/implementing-ppr-in-an-adapter` (seed + resume), `/adapters/output-types`, `/adapters/routing-information`, `/adapters/testing-adapters`.
**OpenNext** (source-verified): `types/overrides.ts` (IncrementalCache, TagCache, Queue, Wrapper, Converter, CDNInvalidation), `types/cache.ts` (IncrementalCacheValue, APP_PAGE postponed/segmentData, ComposableCacheHandler), `build/createAssets.ts` (BUILD_ID cache layout), `build/compileConfig.ts`, `overrides/tagCache/dynamodb.ts` (BUILD_ID namespacing), docs `aws/config/{overrides,custom_overrides}`, `aws/config/overrides/{incremental_cache,tag_cache}`, `aws/inner_workings/caching`, `cloudflare`. License: MIT (both packages).

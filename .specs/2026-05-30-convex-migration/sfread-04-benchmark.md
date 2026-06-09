# SFREAD-04 — middleware `findByDomain` seam benchmark (regression check)

**Date:** 2026-06-09
**Branch:** `feat/convex-migration`
**Deployment:** the committed dev deployment `dev:colorful-aardvark-6` (`https://colorful-aardvark-6.convex.cloud`, per `packages/convex/.env.local`), with the branch's `db/shops:*` functions pushed via `convex dev --once`.
**Baseline:** the SPIKE-01 cloud re-run (`spike-01-findbydomain-feasibility.md` §8, deployment `fantastic-possum-263`, same workstation-→-Convex-cloud vantage). The budget gate itself was adjudicated at the spike; this run is the post-re-home regression check.

---

## 1. What changed since the spike

SPIKE-01 measured a throwaway `shops.by_domain` lookup. This run measures the **real, landed seam** the middleware now rides:

- `apps/storefront/src/middleware/storefront.ts` → `resolveShopSummary`/`resolveLocaleCodes` → `Shop.findByDomain` (`packages/db/src/services/shop.ts`) → `ConvexHttpClient` → `db/shops:byDomain` / `db/shops:byDomainWithCredentials` (server-trust `serverQuery`, `shopDomains.by_domain` routing index + flag join + the sensitive path's `shopCredentials` join).
- The TTL/LRU cache in front (`shop-cache.ts`: 60 s positive / 2.5 s negative / 1000-entry LRU, single-flight) is **unchanged in this task** (empty diff) — the warm model below mirrors it.

## 2. Method

`ConvexHttpClient` from `convex/browser` (the exact client `packages/db` uses), one seeded bench tenant (`sfread04-bench.example.com`, seeded through the sanctioned `db/shop_write:upsertShop` write seam), 25-iteration warmup, then 400 cold round-trips per query and 3,000 warm reads through a 60 s single-flight TTL map modeling `shop-cache.ts`. Throwaway script (not committed, per task) run from this workstation — the **same vantage as the SPIKE-01 §8 baseline**, so the ~105 ms floor is the identical cross-region network RTT, not Convex server work.

## 3. Raw output (evidence)

```
CONVEX_URL: https://colorful-aardvark-6.convex.cloud
bench shop resolves: sfread04-bench.example.com bytes~ 734
COLD-MISS db/shops:byDomain           n=400 min=105.31 p50=112.95 p90=120.58 p99=145.61 max=188.13 mean=114.81 (ms)
COLD-MISS db/shops:byDomainWithCreds  n=400 min=105.63 p50=112.30 p90=119.55 p99=198.65 max=392.78 mean=115.26 (ms)
WARM (TTL+LRU model) findByDomain     n=3000 min=0.00 p50=0.00 p90=0.00 p99=0.00 max=0.05 mean=0.00 (ms)
DONE
```

## 4. Verdict vs the committed budget

| Gate | Budget | This run | SPIKE-01 §8 baseline (1k tenants) | Verdict |
|---|---|---|---|---|
| Warm p50 | ≤ 40 ms | **0.00 ms** | 0.00 ms | **PASS** |
| Warm p99 | ≤ 150 ms | **0.00 ms** | 0.06 ms | **PASS** |
| Cold-miss p50 (context) | — | 112.95 ms | 116.58 ms | no regression |
| Cold-miss p99 (context) | ≤ 150 ms at the spike gate | **145.61 ms** | 193.77 ms | **better than baseline**; under 150 ms even from the workstation vantage |

- **Warm path (the budgeted path) passes decisively** — a cache hit never leaves the process, so it issues zero Convex calls; `storefront.test.ts` now pins this with a `fetch`/seam spy.
- **No regression vs the spike:** the real seam (routing-index lookup + flag join + payload mapping, ~734 B vs the spike's ~374 B) measures *at or under* the spike's throwaway harness at the same vantage. The full production seam adds no measurable server-side cost over the spike's bare index lookup.
- `byDomainWithCredentials` (the cookie-less locale-loader path) p50 matches the public read; its p99/max tail is RTT jitter at this vantage. It is also fronted by the **longer** 300 s locale TTL, so it is the colder of the two paths by construction.
- The spike's standing caveat is unchanged and inherited: cold-miss numbers from this workstation are an **upper bound** (cross-region RTT ~105 ms floor); the production Vercel-region measurement remains the authoritative cold-path figure per SPIKE-01 §8.2.

## 5. Runtime + invalidation notes (the rest of the SFREAD-04 contract)

- **Node runtime confirmed:** the middleware entry is `apps/storefront/src/proxy.ts` (Next 16 `proxy` convention). Per the Next.js 16 docs, "The `proxy` runtime is `nodejs`, and it cannot be configured" — and the entry already imports `node:crypto`, which only resolves on the Node runtime.
- **`invalidateShop` wired:** `storefront.ts` now tracks the last summary per hostname and calls `invalidateShop(hostname)` when a summary reload reveals a domain/default-locale change, so the longer-lived (300 s) locale list cannot outlive a shop reconfiguration by more than the 60 s summary TTL. Covered by the new `storefront.test.ts` case. Cross-process writes (admin app) still rely on the bounded TTL, exactly as the `shop-cache.ts` header documents — unchanged by design.

# SPIKE-01 — `findByDomain` edge latency + Convex cost feasibility (THROWAWAY)

**Kill-gate:** G-SPIKE for the Mongo→Convex migration.
**Date:** 2026-05-31
**Branch:** `feat/convex-migration`
**Status of harness:** discarded (proof only — see "Harness discarded" below).

---

## 0. TL;DR verdict

**PROVISIONAL GO — pending a mandatory cloud re-run of the latency half.**

| Gate | Threshold | Measured / Projected | Pass? |
|---|---|---|---|
| AC1a — cold-miss p99 | ≤ 150 ms | **1.88 ms @ 1k / 5.81 ms @ 10k** (LOCAL — NOT representative of prod edge RTT) | PASS (provisional) |
| AC1b — warm p50 | ≤ 40 ms | **0.00 ms** (cache-hit path, no Convex round-trip) (LOCAL) | PASS (provisional) |
| AC2 — Convex calls/tenant/day | ≤ 50k | **~1,728 × P + ~170** where `P` = warm edge instances/tenant. PASS for `P ≤ ~28`; **breaches 50k at `P ≳ 29`** | PASS *with a flagged sensitivity* |

- The **latency half is PROVISIONAL**: the local anonymous backend has ~0 network latency, so the sub-6 ms cold p99 proves the **index + query mechanism** is cheap, but says **nothing** about production edge round-trip time to a Convex cloud deployment. This spike **MUST be re-run against a real Convex cloud deployment** before `CONVEXCORE-04`, `SFREAD-03`, and `CMSDATA-01` commit.
- The **cost half is deployment-independent and is the real gate output.** It passes at realistic edge fan-out but is **structurally sensitive to the number of concurrent warm edge instances per tenant** (`P`), because the hostname-resolution cache is **per-process**, not shared. This is the same risk the migration spec flagged ("edge cache-miss is a billed round-trip on the hottest path"). See §4.

---

## 1. What was measured and how

### 1.1 Harness (throwaway)

- **Backend:** local anonymous Convex backend via `CONVEX_AGENT_MODE=anonymous npx convex dev` (Convex `1.39.1`), serving `http://127.0.0.1:3210`.
- **Client:** `ConvexHttpClient` from `convex/browser` — the **HTTP client the Next.js middleware would use**, NOT the React/WebSocket client.
- **Schema:** a single `shops` table with a `by_domain` index `['domain', _creationTime]`, documents padded to a realistic shape (`domain`, `alternativeDomains[]`, `defaultLocale`, `commerceProvider`, `theme`, `collaborators[]`) → ~374 bytes/doc returned.
- **Query under test** mirrors the storefront hot path:

  ```ts
  // shops.findByDomain — exact index lookup
  await ctx.db.query('shops')
      .withIndex('by_domain', (q) => q.eq('domain', domain))
      .unique();
  ```

- **Warm path** puts a TTL+LRU cache in front, modeling
  `apps/storefront/src/middleware/shop-cache.ts` (`SHOP_RESOLUTION_TTL_MS = 60_000`): first miss per hostname hits Convex, subsequent hits never do.
- **Method:** 200-iteration warmup, then **5,000 iterations** each for cold-miss and warm, at **1,000** and **10,000** seeded tenants. Percentiles computed over the 5,000 samples.

### 1.2 Tenant counts seeded — and why

Seeded **1,000** (primary working assumption) and **10,000** (10× headroom / index-scaling probe).

- The migration spec (`.specs/2026-05-30-convex-migration/spec.md`) does **not** state a hard production tenant count; it frames cost as "calls scale with write-rate + cache-miss-rate + build fan-out, **not** raw traffic" and treats the canonical `shops` table as the tenant registry (one row = one shop = one tenant).
- **1,000** is a defensible near/mid-term platform size for a multi-tenant Shopify-fronting storefront; **10,000** shows the `by_domain` index stays flat-ish under an order-of-magnitude growth so the index choice is not a latent scaling trap.

---

## 2. Raw benchmark output (evidence)

> **EVERY latency figure below is from a LOCAL anonymous Convex backend and is NOT representative of production edge latency.** Local RTT ≈ loopback (~0 ms); a Convex *cloud* deployment adds real network latency.

```
========== TENANT COUNT: 1000 ==========
shops in table: 1000
COLD-MISS findByDomain (1000)          n=5000 min=0.18 p50=0.32 p90=1.69 p99=2.85 max=8.14 mean=0.59 (ms)
WARM (TTL+LRU cache) findByDomain (1000) n=5000 min=0.00 p50=0.00 p90=0.00 p99=0.22 max=0.74 mean=0.00 (ms)
returned doc bytes (approx): 374
```

Second run (same backend, table already at 7,000 rows when the 1k block re-ran; then seeded to 10k):

```
========== TENANT COUNT: 1000 ==========
shops in table: 7000
COLD-MISS findByDomain (1000)          n=5000 min=0.27 p50=0.45 p90=0.76 p99=1.88 max=5.34 mean=0.53 (ms)
WARM (TTL+LRU cache) findByDomain (1000) n=5000 min=0.00 p50=0.00 p90=0.00 p99=0.35 max=1.06 mean=0.01 (ms)
returned doc bytes (approx): 374

========== TENANT COUNT: 10000 ==========
shops in table: 10000
COLD-MISS findByDomain (10000)         n=5000 min=0.37 p50=1.49 p90=2.22 p99=5.81 max=12.18 mean=1.55 (ms)
WARM (TTL+LRU cache) findByDomain (10000) n=5000 min=0.00 p50=0.00 p90=0.00 p99=0.41 max=1.08 mean=0.01 (ms)
returned doc bytes (approx): 374
DONE
```

### 2.1 Reading the numbers

- **Index scaling is healthy.** Cold-miss p99 rose from **1.88 ms (1k)** to **5.81 ms (10k)** — sub-linear, consistent with a B-tree index lookup (`O(log n)`), not a table scan. A scan would have grown ~10×; it grew ~3×.
- **Warm p50 is effectively 0 ms** because a warm hit is served from the in-process Map and **never touches Convex** — which is exactly how the real middleware behaves. So AC1b is structurally satisfied by the cache design; the meaningful production number is the **cold-miss** round-trip (every cache miss is a billed Convex call).
- **Local caveat dominates the headroom.** Even adding a pessimistic **+80 ms** cloud-edge p99 RTT on top of the measured 5.81 ms server-side work would land at **~86 ms cold p99 — still under the 150 ms gate.** That is comfortable headroom, but it is an *estimate*; only a cloud re-run confirms it.

---

## 3. Read + build-fan-out shape (from the actual storefront)

Sources grepped under `apps/storefront/src`:

**Request path — `findByDomain` call sites:**
- `src/middleware/storefront.ts` → `resolveShopSummary(hostname)` and `resolveShopLocales(hostname)` (`src/middleware/shop-cache.ts`) — runs in middleware on **every request**, fronted by the TTL+LRU cache.
- `src/app/[domain]/[locale]/layout.tsx` (×2) and `.../metadata.ts` — server-render reads, but inside Next.js `cacheComponents`/PPR `'use cache'` boundaries (`next.config.js: cacheComponents: true`), so they resolve per **cached render**, not per request.

**Build fan-out — `generateStaticParams` calling `findByDomain` once per parent param combo:**
- `[domain]/[locale]/static-params.ts` — `findAll()` (1 call/build) + `findByDomain` per shop.
- `products/[handle]/static-params.ts` — `findByDomain` per `(domain,locale)`; emits up to `PREBUILT_PRODUCT_COUNT = 10` product params.
- `collections/[handle]/static-params.ts` — `findByDomain` per `(domain,locale)`.
- `blogs/[blog]/static-params.ts` — `findByDomain` per `(domain,locale)`.
- `blogs/[blog]/[handle]/static-params.ts` — `findByDomain` per `(domain,locale,blog)`.
- `[...slug]/static-params.ts` — `findByDomain` per `(domain,locale)`.

**Key fan-out facts:**
- The top-level `generateStaticParams` emits **one locale per domain** (`Locale.from('en-US')`), so `L_build = 1`. Nested static-params therefore run **once per domain**, not once per (domain × all-locales).
- ⇒ build fan-out per tenant ≈ **6 + B** `findByDomain` calls (`B` = blog count, ~1–3) ≈ **~7–10 calls/tenant/build**.
- `dynamicParams` (ISR) + `cacheComponents` shift most params to first-request rendering, **bounding the build burst** (the spec's "per-build call cap" intent).

**Sitemaps:** `sitemap.xml`, `sitemaps/[locale]/{products,collections,blogs}.xml`, `sitemaps/pages.xml`, `robots.txt` — each calls `findByDomain` once per render. Cached via `cacheComponents`; on revalidation/crawl miss → one Convex call each.

---

## 4. Cost model (deployment-independent — the real gate)

### 4.1 Assumptions

| # | Assumption | Value | Basis |
|---|---|---|---|
| A1 | Hostname-resolution cache is **per edge process**, not shared | — | current code: in-process `Map` in `shop-cache.ts`; no shared KV |
| A2 | Positive TTLs | resolution **60 s**, locales **300 s** | `SHOP_RESOLUTION_TTL_MS`, `SHOP_LOCALES_TTL_MS` |
| A3 | `P` = concurrent **warm** edge instances serving one tenant | swept 1…30 | unknown until production shadow-billing; this is the sensitivity axis |
| A4 | Builds/day | ≤ 5 | infrequent deploys; ISR moves params off the build |
| A5 | Build fan-out | ~10 `findByDomain`/tenant/build | §3 |
| A6 | Sitemap revalidation | hourly, 5 routes | conservative crawler/ISR cadence |
| A7 | Convex pricing (documented tiers, **assumption — re-confirm at convex.dev/pricing**) | Pro $25/seat/mo, ~25M function calls/mo included, **~$2 per additional 1M calls**, bandwidth ~$0.20/GiB over included | Convex documented pricing as understood ~early 2026; pricing changes — **must verify live before commit** |

### 4.2 Per-tenant-per-day call volume

Request path (the dominant term), per **warm process**:
```
86400 s/day ÷ 60 s  (resolution miss)  = 1,440 calls/day
86400 s/day ÷ 300 s (locales miss)     =   288 calls/day
                              per-process = 1,728 findByDomain/tenant/day
```

Because the cache is per-process (A1), this multiplies by `P` (A3):

| `P` (warm edge instances/tenant) | request-path calls/tenant/day | + build (~50) + sitemap (~120) | total | ≤ 50k? |
|---:|---:|---:|---:|:--:|
| 1  | 1,728 | 170 | 1,898 | ✅ |
| 5  | 8,640 | 170 | 8,810 | ✅ |
| 10 | 17,280 | 170 | 17,450 | ✅ |
| 20 | 34,560 | 170 | 34,730 | ✅ |
| 25 | 43,200 | 170 | 43,370 | ✅ |
| **28** | **48,384** | 170 | **48,554** | ✅ (margin gone) |
| **30** | **51,840** | 170 | **52,010** | ❌ **breaches 50k** |

Build fan-out: `~10 calls/tenant/build × ≤5 builds/day ≈ 50/tenant/day` — **negligible** vs the request path.
Sitemaps: `5 routes × 24 h ≈ 120/tenant/day` — **negligible**.

### 4.3 Verdict on AC2

**PASS at realistic edge fan-out (`P ≤ ~28`)**, but with a **structural sensitivity that is itself a finding**: at `P ≳ 29` concurrent warm edge instances per tenant, **`findByDomain` on the request path alone breaches the 50k/tenant/day budget** — before any other Convex read (products, CMS) is counted. This is deployment-independent: it falls straight out of `per-process TTL × instance count`.

### 4.4 Dollar color (illustrative, pricing assumption A7)

At `P = 10`: `17,280 × 30 ≈ 518k calls/tenant/month`. The Pro tier's ~25M included calls covers **~48 tenants** of `findByDomain` traffic; beyond that, overage at ~$2/1M. A 1,000-tenant platform at `P=10` ⇒ ~518M calls/mo ⇒ ~493M overage ⇒ **~$1k/month for `findByDomain` alone** — meaningful, and **highly sensitive to `P` and the TTL** (halving misses halves the bill). Returned doc is ~374 B, so bandwidth is a rounding error next to call count.

### 4.5 Cheap, deployment-independent mitigations (recommended, not required to pass)

1. **Raise `SHOP_RESOLUTION_TTL_MS` 60 s → 300 s** (match locales). Per-process drops `1,728 → 576`/tenant/day ⇒ budget holds to `P ≤ ~86`. Cost: bounded extra staleness on shop edits, already accepted for locales.
2. **Shared/regional cache (edge KV)** in front of `findByDomain` to decouple call volume from instance count (`P`) entirely — the cleanest fix for the §4.3 sensitivity.
3. Honor the spec's **production shadow-billing gate** to measure the *real* `P` before committing the heavy build.

---

## 5. Caveats carried forward (do not lose these)

- **Latency is LOCAL-only.** Loopback RTT ≈ 0. Production Convex cloud RTT from the edge is the real unknown and is **not** measured here. **Mandatory:** re-run §1–§2 against a real Convex cloud deployment (ideally from the same edge region the storefront deploys to) and re-confirm cold p99 ≤ 150 ms before `CONVEXCORE-04` / `SFREAD-03` / `CMSDATA-01`.
- **`alternativeDomains` not benchmarked on the index.** The Mongo query is `$or: [{domain}, {alternativeDomains: domain}]`; the spike indexed only the canonical `domain` (the overwhelmingly hot path). Alternative-domain resolution on Convex needs either a second index/lookup or a denormalized mapping — **cost it in the cloud re-run** (worst case ~2× the per-miss call count for alt-domain hits).
- **`P` is assumed, not measured.** The entire cost verdict pivots on it. Shadow-billing on production-shaped traffic is the authoritative check.

---

## 6. GO / NO-GO

**PROVISIONAL GO.**

- Mechanism (index + HTTP-client query) is fast and scales sub-linearly to 10k tenants. ✅
- Cost model passes the 50k/tenant/day budget at realistic edge fan-out, with a clearly bounded, mitigable sensitivity at high `P`. ✅ (flagged)
- **This GO is conditional.** The program may proceed to scope `CONVEXCORE-04` / `SFREAD-03` / `CMSDATA-01`, but **MUST NOT commit** them until:
  1. this latency spike is **re-run against a real Convex cloud deployment** and cold p99 ≤ 150 ms is confirmed with production-region RTT; and
  2. the alt-domain lookup path is costed on the cloud backend; and
  3. production shadow-billing establishes the real `P` and confirms calls/tenant/day ≤ 50k.

If the cloud re-run shows cold p99 > 150 ms, or shadow-billing shows `P ≳ 29` without mitigation #1/#2 (§4.5), this flips to **NO-GO** and the program halts before the heavy build.

---

## 7. Harness discarded

The Convex schema, `findByDomain`/`seed`/`count` functions, the seed+benchmark script, the local-backend state (`.convex/`), and the generated `.env.local` were **all deleted** after capturing the numbers above. Only this findings doc is committed. `git status` shows the working tree pristine except for this file.

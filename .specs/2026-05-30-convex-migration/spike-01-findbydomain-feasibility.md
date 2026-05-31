# SPIKE-01 — `findByDomain` edge latency + Convex cost feasibility (THROWAWAY)

**Kill-gate:** G-SPIKE for the Mongo→Convex migration.
**Date:** 2026-05-31
**Branch:** `feat/convex-migration`
**Status of harness:** discarded (proof only — see "Harness discarded" below).

---

## 0. TL;DR verdict

**LATENCY AXIS NOT FIRMED — cloud re-run FAILS the cold-miss gate from this vantage (see §8). Cost axis remains PASS.** The mandatory cloud re-run was performed (2026-05-31, real Convex cloud dev deployment, real local→cloud network RTT). It did **not** upgrade the latency half to a FIRM GO: it surfaced a **vantage-attributable FAIL** (cold p99 193.77 ms @ 1k / 225.61 ms @ 10k) whose floor is ~110 ms of cross-region network RTT, not Convex server work. The gate stays **blocked on a production-edge-region re-measurement** before `CONVEXCORE-04` / `SFREAD-03` / `CMSDATA-01` commit. See §8.

| Gate | Threshold | Measured / Projected | Pass? |
|---|---|---|---|
| AC1a — cold-miss p99 | ≤ 150 ms | **CLOUD: 193.77 ms @ 1k / 225.61 ms @ 10k** (real local→cloud RTT, this machine; LOCAL was 1.88/5.81 ms) | **FAIL from this vantage** (see §8) |
| AC1b — warm p50 | ≤ 40 ms | **CLOUD: 0.00 ms** (cache-hit path, no Convex round-trip) | PASS |
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

**Latency axis: NOT a FIRM GO — measured FAIL from this vantage; gate stays blocked pending an edge-region re-measurement (see §8). Cost axis: PASS (unchanged, §4).**

- Mechanism (index + HTTP-client query) is fast and scales sub-linearly to 10k tenants. ✅ (server-side work is sub-6 ms — proven by the local run; the cloud floor is network RTT, not query cost)
- Cost model passes the 50k/tenant/day budget at realistic edge fan-out, with a clearly bounded, mitigable sensitivity at high `P`. ✅ (flagged)
- **Latency is the open axis.** The cloud re-run (§8) measured cold-miss p99 of **193.77 ms (1k) / 225.61 ms (10k)** — over the 150 ms gate. This does **not** prove the mechanism is too slow: the cloud p50 floor (~116–122 ms) is essentially pure cross-region network RTT from this machine's ISP to the Convex deployment region, since the same query measured **0.32 ms p50 / 5.81 ms p99 server-side** on the local backend. The FAIL is therefore **vantage-attributable, not mechanism-attributable**, but it is still a FAIL and the gate **cannot be firmed to GO** without a measurement from the production Vercel edge region (co-located with / peered to the Convex deployment region), where the network component collapses.
- **The program MUST NOT commit** `CONVEXCORE-04` / `SFREAD-03` / `CMSDATA-01` until:
  1. the latency spike is re-measured **from a Vercel edge function in (or peered to) the Convex deployment region** and cold p99 ≤ 150 ms is confirmed end-to-end; and
  2. ~~the alt-domain lookup path is costed on the cloud backend~~ — **DONE (§8.3):** alt-domain resolution needs a denormalized `domainAliases` mapping table (Convex has no Mongo multikey array index); its latency is within noise of the canonical lookup; and
  3. production shadow-billing establishes the real `P` and confirms calls/tenant/day ≤ 50k.

The earlier "if the cloud re-run shows cold p99 > 150 ms … this flips to NO-GO" trigger fired **as literally measured**, but the root cause is the measurement vantage (cross-continent RTT), not Convex. The honest disposition is: **HOLD — re-measure from the edge region before GO or NO-GO is declared.** A flat NO-GO would wrongly indict a mechanism the data shows is fast; a FIRM GO is unsupported because no number under 150 ms was observed.

---

## 7. Harness discarded

The Convex schema, `findByDomain`/`seed`/`count` functions, the seed+benchmark script, the local-backend state (`.convex/`), and the generated `.env.local` were **all deleted** after capturing the numbers above. Only this findings doc is committed. `git status` shows the working tree pristine except for this file. The cloud re-run (§8) created a throwaway Convex project (`commerce-spike`, deployment `fantastic-possum-263`) and its harness/`.env.local`; all of it was likewise deleted, except the cloud project itself, which must be removed from the Convex dashboard manually (cannot be reliably deleted via CLI).

---

## 8. CLOUD RE-RUN — real network RTT (2026-05-31)

**Vantage:** measured from **this developer machine (local workstation ISP) → Convex cloud dev deployment** at `https://fantastic-possum-263.convex.cloud` (project `commerce-spike`, team default region). This is **real network RTT** — NOT loopback — but it is **NOT the production Vercel edge region**. The storefront runs on Vercel edge/serverless, which deploys close to (and peers with) the Convex region; this workstation does not. Treat the network component below as an **upper bound**, not the production figure.

**Method:** identical to §1 — `ConvexHttpClient` from `convex/browser` (the HTTP client the middleware uses), `by_domain` index lookup, TTL+LRU warm cache modeling `SHOP_RESOLUTION_TTL_MS = 60_000`. Iteration counts were trimmed from 5,000 → **800 cold / 3,000 warm** per phase because each cloud round-trip costs ~120 ms (5,000 × 4 phases × 2 counts ≈ 48 min/run was infeasible); 800 samples still resolve p99 to the 8th-worst observation.

### 8.1 Raw output (evidence)

```
========== TENANT COUNT: 1000 ==========
CONVEX_URL: https://fantastic-possum-263.convex.cloud
shops in table: 1000
COLD-MISS findByDomain (1000)              n=800 min=106.11 p50=116.58 p90=125.41 p99=193.77 max=262.03 mean=119.25 (ms)
WARM (TTL+LRU cache) findByDomain (1000)   n=3000 min=0.00 p50=0.00 p90=0.00 p99=0.06 max=131.47 mean=0.79 (ms)
ALT-DOMAIN findByAlias (1000)              n=800 min=105.57 p50=122.98 p90=131.05 p99=181.07 max=319.40 mean=124.98 (ms)
ALT-DOMAIN findByDomainWithFallback (1000) n=800 min=104.25 p50=125.19 p90=133.97 p99=228.78 max=1535.06 mean=130.48 (ms)
DONE

========== TENANT COUNT: 10000 ==========
CONVEX_URL: https://fantastic-possum-263.convex.cloud
shops in table: 10000
COLD-MISS findByDomain (10000)             n=800 min=110.56 p50=122.28 p90=130.18 p99=225.61 max=1980.55 mean=127.47 (ms)
WARM (TTL+LRU cache) findByDomain (10000)  n=3000 min=0.00 p50=0.00 p90=0.00 p99=0.02 max=138.64 mean=0.82 (ms)
ALT-DOMAIN findByAlias (10000)             n=800 min=113.94 p50=125.06 p90=133.53 p99=209.99 max=835.48 mean=129.14 (ms)
ALT-DOMAIN findByDomainWithFallback (10000) n=800 min=112.02 p50=128.40 p90=136.73 p99=182.69 max=229.28 mean=129.94 (ms)
DONE
```

### 8.2 AC1 re-evaluation against the 150 ms / 40 ms gate

| Gate | Threshold | 1k | 10k | Pass? |
|---|---|---|---|---|
| AC1a — cold-miss p99 | ≤ 150 ms | **193.77 ms** | **225.61 ms** | **FAIL** (both) |
| AC1a — cold-miss p50 | (context) | 116.58 ms | 122.28 ms | — |
| AC1b — warm p50 | ≤ 40 ms | **0.00 ms** | **0.00 ms** | **PASS** (both) |

- **Warm p50 PASSES decisively** — a TTL cache hit never touches Convex, exactly as in `shop-cache.ts`. Network distance is irrelevant on the warm path; this result is robust regardless of vantage.
- **Cold-miss p99 FAILS at both tenant counts.** But decompose it: cloud cold p50 ≈ **116–122 ms** vs the local p50 of **0.32–1.49 ms** for the *same query on the same index*. The ~115 ms delta is **pure network RTT** from this workstation to the Convex region — a cross-continent hop. Server-side work is unchanged and tiny. Index scaling is still healthy (p50 1k→10k rose only ~6 ms; p99 tail is RTT jitter, not query cost). So the gate breach is **caused by the measurement vantage**, not by Convex's `findByDomain`.
- **Vantage caveat (decisive):** the production storefront does not call Convex from this workstation. Vercel edge/serverless functions execute in regions adjacent to (and peered with) the Convex deployment, where RTT is typically single-digit-to-low-tens of ms. Adding a realistic ~10–30 ms edge→Convex RTT to the proven <6 ms server work lands cold p99 **well under 150 ms** — but that is a projection. **Because the only real-network number in hand FAILS, the gate is NOT firmed.** A final measurement from a Vercel function co-located with the Convex region is **mandatory** before GO.

### 8.3 alternativeDomains finding (condition #2 — now resolved)

- **Mechanism finding (new, important):** Convex has **no Mongo-style multikey array index.** The Mongoose query `$or: [{ domain }, { alternativeDomains: domain }]` relies on a multikey index over the `alternativeDomains` array; Convex's `.index('…', ['alternativeDomains'])` indexes the **array value as a whole**, so `q.eq('alternativeDomains', someString)` does not compile (type error: `string` not assignable to `string[]`) and would not match per-element even if coerced. The realistic Convex shape is a **denormalized `domainAliases` mapping table** (`{ alias, shopId }` with a `by_alias` index); the fallback is then an alias index lookup **plus a `db.get`** to fetch the owning shop — two reads instead of one.
- **Latency:** the alt-domain paths are **within noise of the canonical lookup** at this vantage (network RTT dominates both): isolated alias lookup p99 **181.07 ms (1k) / 209.99 ms (10k)**; full `$or`-equivalent (canonical miss → alias lookup → `db.get`) p99 **228.78 ms (1k) / 182.69 ms (10k)**. The extra `db.get` adds no meaningful latency on top of the round-trip — both reads run server-side inside one query function, so the alt path costs **one** client round-trip, same as canonical.
- **Cost:** because the fallback is **one Convex query call** (the `db.get` is in-function, not a second billed call), an alt-domain hit costs the **same one call/miss** as a canonical hit — it does **not** double the per-miss call count feared in §5. The denormalized `domainAliases` table adds 2 rows/tenant of storage (negligible vs the ~374 B shop doc) and must be kept in sync on shop writes (write-amplification of 2 alias upserts per shop edit — well within the build/write budget).

### 8.4 Teardown

The cloud harness (`schema.ts`, `spike.ts`, the scratch benchmark, `.env.local`, regenerated `_generated/`) was deleted and `_generated/` restored to HEAD. The throwaway **`commerce-spike` Convex project (deployment `fantastic-possum-263`) must be deleted manually from dashboard.convex.dev** — the CLI cannot reliably delete a cloud project. Only this doc is committed.

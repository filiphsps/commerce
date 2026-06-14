# Domain Connection & Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After creating a shop, let an operator connect a real customer-facing domain and verify it actually points at the platform — either at the storefront's Vercel project (provisioned via the Vercel API) or, as a fallback, at `SERVICE_DOMAIN` via a DNS-over-HTTPS check.

**Architecture:** Verification is **post-create and informational** (it never gates storefront routing). The wizard creates the shop with its domain row stored `status: 'pending'`, then redirects to a new `settings/domain` screen that provisions the domain on the storefront's Vercel project (when admin holds Vercel creds), shows the DNS records to add, and polls a `verifyDomain` server action that flips the row to `verified`/`failed`. When no Vercel creds exist (dev / self-host) it falls back to a DoH DNS check; `*.localhost` domains auto-verify and skip all network calls. Legacy domain rows (no `status`) read as `verified` via seam-level coalescing — **no data migration**.

**Tech Stack:** Next.js 16 App Router (admin), React Server Components + one client panel, Convex (schema + mutation/query), `@nordcom/commerce-db` seam, `@nordcom/commerce-errors`, Vercel REST API (`v9`/`v10` projects-domains), Google DNS-over-HTTPS JSON API, Vitest (`convex-test` in-memory for Convex; fetch-mocked unit tests elsewhere).

---

## Resolved Decisions (from grilling)

| Topic | Decision |
|---|---|
| Mechanism | **Hybrid**: provision + verify via Vercel API when creds present; else DoH DNS check |
| Timing | **Post-create**; domain stored `pending`, verified on the `settings/domain` screen |
| Routing gate | **None** — `findByDomain` unchanged; `status` drives UI only |
| Legacy rows | Read-coalesced `undefined → verified`/`service_domain`; **no backfill migration** |
| Schema | `shopDomain += status?, via?, verifiedAt?, lastCheckedAt?` (all optional) |
| Vercel target | Admin holds `VERCEL_TOKEN` + `VERCEL_STOREFRONT_PROJECT_ID` (+ optional `VERCEL_TEAM_ID`); domains added to the storefront project |
| DNS | DoH via `fetch` (Google `dns.google/resolve`); accept Vercel targets **or** `SERVICE_DOMAIN` |
| Verify trigger | Button + capped client auto-poll while `pending`; **no cron** |
| Placement | `(dashboard)/[domain]/settings/domain/` page + `@subnav/settings` link; wizard redirects there |
| Apex | Accept either CNAME or A; **show both** record options; no PSL dependency; `*.localhost` auto-verified |
| Changeset | **Not required** — `.changeset/config.json` ignores all `@nordcom/*` except `@nordcom/cart-*`; none touched |

## Vercel REST endpoints (confirm against current Vercel docs during Task 8)

- Add domain to project: `POST https://api.vercel.com/v10/projects/{projectId}/domains` body `{ "name": "<domain>" }` — treat `409` (already added) as success.
- Domain status: `GET https://api.vercel.com/v9/projects/{projectId}/domains/{domain}` → `{ verified: boolean, verification?: [...] }`.
- Config/misconfig: `GET https://api.vercel.com/v6/domains/{domain}/config` → `{ misconfigured: boolean }`.
- All requests: `Authorization: Bearer ${VERCEL_TOKEN}`; append `?teamId=${VERCEL_TEAM_ID}` when set.

## File Structure

**`@nordcom/commerce-errors`** (`packages/errors/src/index.ts`)
- Add `ApiErrorKind.API_DOMAIN_VERIFICATION_FAILED`, class `DomainVerificationError`, and a `getErrorFromCode` case.

**`@nordcom/commerce-convex`** (`packages/convex/convex/`)
- `tables/shops.ts` — extend `shopDomainValidator` with the four optional fields.
- `db/shop_write.ts` — `reconcileDomains` inserts new rows with `status: 'pending'`.
- `db/shop_domain_write.ts` *(new)* — `setDomainVerification` mutation.
- `db/shops.ts` — `domainVerification` query (raw row fields by domain).

**`@nordcom/commerce-db`** (`packages/db/src/`)
- `models/` — `DomainVerification` type + `DomainVerificationInput`.
- `services/shop.ts` — `getDomainVerification` + `setDomainVerification` seam methods (legacy coalescing).
- `services/service.ts` + `services/service-seam-contract.snapshot.ts` — extend the seam contract + regenerate snapshot.

**`@nordcom/commerce-admin`** (`apps/admin/src/`)
- `lib/domains/config.ts` *(new)* — Vercel creds reader + `hasVercelCreds`.
- `lib/domains/targets.ts` *(new)* — Vercel record constants, `isLocalhostDomain`, `buildRecordInstructions`.
- `lib/domains/dns.ts` *(new)* — DoH resolver.
- `lib/domains/vercel.ts` *(new)* — Vercel REST client (`server-only`).
- `lib/domains/verify.ts` *(new)* — DNS-path connection check (`checkDomainConnection`).
- `app/(app)/(dashboard)/[domain]/settings/domain/page.tsx` *(new)* — server page.
- `app/(app)/(dashboard)/[domain]/settings/domain/actions.ts` *(new)* — `verifyDomain` server action.
- `app/(app)/(dashboard)/[domain]/settings/domain/connect-panel.tsx` *(new)* — client UI (records, badge, Verify, auto-poll).
- `app/(app)/(dashboard)/[domain]/@subnav/settings/default.tsx` — add `Domain` nav item.
- `app/(app)/(setup)/new/actions.ts` — redirect to `settings/domain` after create.

**Env / docs**
- `.env.example`, `apps/admin/.env.example` — add `VERCEL_TOKEN`, `VERCEL_STOREFRONT_PROJECT_ID`, `VERCEL_TEAM_ID`.
- `apps/docs/content/operations/deployment.mdx` — document the three vars + the connect flow.

---

## Phase 0 — Errors package

### Task 0: `DomainVerificationError`

**Files:**
- Modify: `packages/errors/src/index.ts`
- Test: `packages/errors/src/index.test.ts` (append; create if absent)

- [ ] **Step 1: Write the failing test**

Append to `packages/errors/src/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ApiErrorKind, DomainVerificationError, getErrorFromCode } from './index';

describe('DomainVerificationError', () => {
    it('carries the domain-verification code and a 422 status', () => {
        const error = new DomainVerificationError('shop.acme.com is not pointed at the platform yet.');
        expect(error.code).toBe(ApiErrorKind.API_DOMAIN_VERIFICATION_FAILED);
        expect(error.statusCode).toBe(422);
        expect(error.name).toBe('DomainVerificationError');
        expect(error instanceof DomainVerificationError).toBe(true);
    });

    it('is resolvable from its code', () => {
        const resolved = getErrorFromCode(ApiErrorKind.API_DOMAIN_VERIFICATION_FAILED);
        expect(resolved).toBe(DomainVerificationError);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-errors`
Expected: FAIL — `DomainVerificationError` / `API_DOMAIN_VERIFICATION_FAILED` not exported.

- [ ] **Step 3: Add the enum member, class, and resolver case**

In `packages/errors/src/index.ts`: add to the `ApiErrorKind` enum (alongside the existing `API_*` members):

```ts
    API_DOMAIN_VERIFICATION_FAILED = 'API_DOMAIN_VERIFICATION_FAILED',
```

Add the class next to the other `ApiError` subclasses (mirror their field layout, e.g. `ApiTooManyRequestsError`):

```ts
/**
 * A customer-facing domain is not yet pointed at the platform: neither the storefront's Vercel
 * project nor `SERVICE_DOMAIN` resolves from its DNS records (or the Vercel verification has not
 * completed). Recoverable — the operator fixes DNS and re-runs the check.
 *
 * @param message - Optional human detail (e.g. which records are missing).
 * @example
 * ```ts
 * throw new DomainVerificationError('No A or CNAME record points shop.acme.com at the platform.');
 * ```
 */
export class DomainVerificationError extends ApiError {
    public readonly statusCode = 422;
    name = 'DomainVerificationError';
    code = ApiErrorKind.API_DOMAIN_VERIFICATION_FAILED;
    details = 'Domain verification failed';
    description = 'The domain does not yet point at the platform.';
}
```

In the `getErrorFromCode` switch, add a case before the default:

```ts
        case ApiErrorKind.API_DOMAIN_VERIFICATION_FAILED:
            return DomainVerificationError;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-errors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/errors/src/index.ts packages/errors/src/index.test.ts
git commit -m "feat(errors): add DomainVerificationError for domain-connection checks."
```

---

## Phase 1 — Convex schema, reconcile default, mutation & query

### Task 1: Extend `shopDomainValidator`

**Files:**
- Modify: `packages/convex/convex/tables/shops.ts:195-198`

- [ ] **Step 1: Extend the validator**

Replace the `shopDomainValidator` object (lines 195–198) with:

```ts
export const shopDomainValidator = v.object({
    shop: v.id('shops'),
    domain: v.string(),
    /**
     * Connection lifecycle for the domain. Absent on legacy rows (read as `verified` by the
     * `packages/db` seam). New rows are inserted `pending` by `reconcileDomains`; the admin's
     * verify action flips it to `verified`/`failed`. Informational only — routing never reads it.
     */
    status: v.optional(v.union(v.literal('pending'), v.literal('verified'), v.literal('failed'))),
    /** Which target satisfied verification, for the admin badge. Absent → `service_domain` legacy. */
    via: v.optional(v.union(v.literal('vercel'), v.literal('service_domain'), v.literal('localhost'))),
    /** Epoch ms the domain last verified. */
    verifiedAt: v.optional(v.number()),
    /** Epoch ms of the last verify attempt, regardless of outcome. */
    lastCheckedAt: v.optional(v.number()),
});
```

- [ ] **Step 2: Typecheck the package**

Run: `pnpm build:packages && pnpm typecheck --filter @nordcom/commerce-convex`
Expected: PASS — optional fields are additive; existing inserts still type-check.

- [ ] **Step 3: Commit**

```bash
git add packages/convex/convex/tables/shops.ts
git commit -m "feat(convex): add status/via/timestamps to the shopDomain row."
```

### Task 2: `reconcileDomains` inserts new rows as `pending`

**Files:**
- Modify: `packages/convex/convex/db/shop_write.ts:134-136`
- Test: `packages/convex/convex/db/shop_write.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append a test to `packages/convex/convex/db/shop_write.test.ts` (reuse the file's existing `convex-test` harness/imports; the seed helper that creates a shop already exists there — call the same `upsertShop` path used by sibling tests):

```ts
test('a freshly inserted domain row is marked pending', async () => {
    const t = convexTest(schema);
    const created = await t.mutation(api.db.shop_write.upsertShop, {
        shop: {
            name: 'Acme',
            domain: 'pending.example.com',
            design: MINIMAL_DESIGN, // reuse the fixture sibling insert tests use
            commerceProvider: MINIMAL_PROVIDER,
        },
        collaborators: [],
    });
    expect(created).not.toBeNull();

    const row = await t.run(async (ctx) =>
        ctx.db
            .query('shopDomains')
            .withIndex('by_domain', (q) => q.eq('domain', 'pending.example.com'))
            .unique(),
    );
    expect(row?.status).toBe('pending');
});
```

> If `MINIMAL_DESIGN` / `MINIMAL_PROVIDER` fixtures are named differently in the file, use the existing fixture names — do not invent new ones.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-convex -- shop_write`
Expected: FAIL — `row.status` is `undefined`.

- [ ] **Step 3: Set `status: 'pending'` on insert**

In `reconcileDomains` (lines 134–136), change the insert:

```ts
        if (!owner) {
            await ctx.db.insert('shopDomains', { shop: shopId, domain, status: 'pending' });
        }
```

> Leave the delete-diff and "kept" branches untouched — unchanged existing rows keep their stored status, so re-running `upsertShop` on an edit never clobbers a `verified` domain.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-convex -- shop_write`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/convex/convex/db/shop_write.ts packages/convex/convex/db/shop_write.test.ts
git commit -m "feat(convex): insert new shopDomain routing rows as pending."
```

### Task 3: `setDomainVerification` mutation

**Files:**
- Create: `packages/convex/convex/db/shop_domain_write.ts`
- Test: `packages/convex/convex/db/shop_domain_write.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/convex/convex/db/shop_domain_write.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { MINIMAL_DESIGN, MINIMAL_PROVIDER } from './shop_write.test'; // or inline the fixtures if not exported

test('setDomainVerification patches status/via/timestamps on the routing row', async () => {
    const t = convexTest(schema);
    await t.mutation(api.db.shop_write.upsertShop, {
        shop: {
            name: 'Acme',
            domain: 'verify.example.com',
            design: MINIMAL_DESIGN,
            commerceProvider: MINIMAL_PROVIDER,
        },
        collaborators: [],
    });

    const result = await t.mutation(api.db.shop_domain_write.setDomainVerification, {
        domain: 'verify.example.com',
        status: 'verified',
        via: 'vercel',
        verifiedAt: 1_700_000_000_000,
    });
    expect(result).toEqual({ ok: true });

    const row = await t.run(async (ctx) =>
        ctx.db
            .query('shopDomains')
            .withIndex('by_domain', (q) => q.eq('domain', 'verify.example.com'))
            .unique(),
    );
    expect(row?.status).toBe('verified');
    expect(row?.via).toBe('vercel');
    expect(row?.verifiedAt).toBe(1_700_000_000_000);
    expect(typeof row?.lastCheckedAt).toBe('number');
});

test('setDomainVerification is a no-op for an unknown domain', async () => {
    const t = convexTest(schema);
    const result = await t.mutation(api.db.shop_domain_write.setDomainVerification, {
        domain: 'nobody.example.com',
        status: 'failed',
    });
    expect(result).toEqual({ ok: false });
});
```

> If `shop_write.test.ts` does not export its fixtures, inline minimal `MINIMAL_DESIGN`/`MINIMAL_PROVIDER` literals copied from that file rather than importing.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-convex -- shop_domain_write`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the mutation**

Create `packages/convex/convex/db/shop_domain_write.ts`:

```ts
import { v } from 'convex/values';

import { serverMutation } from '../_constructors';

/**
 * Flips one `shopDomains` routing row's connection state after an admin verify attempt. Patches by
 * the global `by_domain` index (domains are globally unique at write time) and always stamps
 * `lastCheckedAt`. A no-op `{ ok: false }` when the domain has no routing row, so a verify against a
 * since-deleted shop fails closed instead of throwing. Informational write only — routing never
 * reads these fields, so no cross-tenant authorization is implied by the patch.
 *
 * @returns `{ ok: true }` when a row was patched, `{ ok: false }` when no row matched the domain.
 */
export const setDomainVerification = serverMutation({
    args: {
        domain: v.string(),
        status: v.union(v.literal('pending'), v.literal('verified'), v.literal('failed')),
        via: v.optional(v.union(v.literal('vercel'), v.literal('service_domain'), v.literal('localhost'))),
        verifiedAt: v.optional(v.number()),
    },
    handler: async (ctx, { domain, status, via, verifiedAt }): Promise<{ ok: boolean }> => {
        const row = await ctx.db
            .query('shopDomains')
            .withIndex('by_domain', (q) => q.eq('domain', domain))
            .first();
        if (!row) {
            return { ok: false };
        }
        await ctx.db.patch(row._id, {
            status,
            ...(via !== undefined ? { via } : {}),
            ...(verifiedAt !== undefined ? { verifiedAt } : {}),
            lastCheckedAt: Date.now(),
        });
        return { ok: true };
    },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-convex -- shop_domain_write`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add packages/convex/convex/db/shop_domain_write.ts packages/convex/convex/db/shop_domain_write.test.ts
git commit -m "feat(convex): add setDomainVerification mutation for the connect flow."
```

### Task 4: `domainVerification` query

**Files:**
- Modify: `packages/convex/convex/db/shops.ts` (append an export)
- Test: `packages/convex/convex/db/shops.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `packages/convex/convex/db/shops.test.ts` (reuse its existing harness/fixtures):

```ts
test('domainVerification returns the routing row state, or null when unknown', async () => {
    const t = convexTest(schema);
    await t.mutation(api.db.shop_write.upsertShop, {
        shop: { name: 'Acme', domain: 'state.example.com', design: MINIMAL_DESIGN, commerceProvider: MINIMAL_PROVIDER },
        collaborators: [],
    });

    const pending = await t.query(api.db.shops.domainVerification, { domain: 'state.example.com' });
    expect(pending).toMatchObject({ domain: 'state.example.com', status: 'pending' });

    const missing = await t.query(api.db.shops.domainVerification, { domain: 'ghost.example.com' });
    expect(missing).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-convex -- db/shops`
Expected: FAIL — `domainVerification` not exported.

- [ ] **Step 3: Implement the query**

Append to `packages/convex/convex/db/shops.ts` (use the file's existing `serverQuery` constructor — match the import already at the top of the file):

```ts
/**
 * Reads the raw connection state of a single routable domain (status/via/timestamps) through the
 * `by_domain` hot index. Returns `null` when the domain has no routing row. Coalescing of legacy
 * rows (absent `status`) happens in the `packages/db` seam, not here, so this stays a thin read.
 *
 * @returns The row's `{ domain, status?, via?, verifiedAt?, lastCheckedAt? }`, or `null`.
 */
export const domainVerification = serverQuery({
    args: { domain: v.string() },
    handler: async (ctx, { domain }) => {
        const row = await ctx.db
            .query('shopDomains')
            .withIndex('by_domain', (q) => q.eq('domain', domain))
            .first();
        if (!row) {
            return null;
        }
        return {
            domain: row.domain,
            status: row.status,
            via: row.via,
            verifiedAt: row.verifiedAt,
            lastCheckedAt: row.lastCheckedAt,
        };
    },
});
```

> If `v` or `serverQuery` are not already imported in `db/shops.ts`, add them to the existing import lines (do not duplicate imports).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-convex -- db/shops`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/convex/convex/db/shops.ts packages/convex/convex/db/shops.test.ts
git commit -m "feat(convex): add domainVerification read for the connect flow."
```

---

## Phase 2 — `packages/db` seam

### Task 5: `DomainVerification` model + seam methods

**Files:**
- Modify: `packages/db/src/models/` (add a `DomainVerification` type to the existing models barrel — find where `OnlineShop`/`ShopBase` are exported and add alongside)
- Modify: `packages/db/src/services/shop.ts`
- Modify: `packages/db/src/services/service.ts` (extend the `ServiceBackend`/`Service` contract if domain reads/writes route through it)
- Test: `packages/db/src/services/shop.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `packages/db/src/services/shop.test.ts` (reuse the file's existing seam-mock harness — the same backend stub `findByDomain` tests use). Add a stub for the two new seam calls and assert coalescing:

```ts
describe('Shop.getDomainVerification', () => {
    it('returns stored state for a pending domain', async () => {
        const backend = makeBackendStub({
            domainVerification: async () => ({ domain: 'shop.acme.com', status: 'pending', via: undefined, verifiedAt: undefined, lastCheckedAt: undefined }),
        });
        const result = await Shop(backend).getDomainVerification('shop.acme.com');
        expect(result).toEqual({ domain: 'shop.acme.com', status: 'pending', via: null, verifiedAt: null, lastCheckedAt: null });
    });

    it('coalesces a legacy row (no status) to verified/service_domain', async () => {
        const backend = makeBackendStub({
            domainVerification: async () => ({ domain: 'legacy.acme.com', status: undefined, via: undefined, verifiedAt: undefined, lastCheckedAt: undefined }),
        });
        const result = await Shop(backend).getDomainVerification('legacy.acme.com');
        expect(result).toMatchObject({ status: 'verified', via: 'service_domain' });
    });

    it('returns null for an unknown domain', async () => {
        const backend = makeBackendStub({ domainVerification: async () => null });
        expect(await Shop(backend).getDomainVerification('ghost.acme.com')).toBeNull();
    });
});

describe('Shop.setDomainVerification', () => {
    it('forwards the write to the seam', async () => {
        const calls: unknown[] = [];
        const backend = makeBackendStub({
            setDomainVerification: async (args: unknown) => { calls.push(args); return { ok: true }; },
        });
        await Shop(backend).setDomainVerification('shop.acme.com', { status: 'verified', via: 'vercel', verifiedAt: 1 });
        expect(calls[0]).toMatchObject({ domain: 'shop.acme.com', status: 'verified', via: 'vercel', verifiedAt: 1 });
    });
});
```

> Adapt `makeBackendStub` / `Shop(backend)` to the file's actual construction idiom (the existing tests show how a `ServiceBackend` is mocked and how the `Shop` service is invoked — mirror it exactly; do not introduce a new construction style).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-db -- shop`
Expected: FAIL — `getDomainVerification` / `setDomainVerification` not on the service.

- [ ] **Step 3: Add the model type**

In the models barrel (where `OnlineShop` etc. are declared), add:

```ts
/** Public connection state of one routable domain, as surfaced by the admin connect screen. */
export type DomainVerification = {
    domain: string;
    status: 'pending' | 'verified' | 'failed';
    via: 'vercel' | 'service_domain' | 'localhost' | null;
    verifiedAt: number | null;
    lastCheckedAt: number | null;
};

/** Write payload for `Shop.setDomainVerification`. */
export type DomainVerificationInput = {
    status: 'pending' | 'verified' | 'failed';
    via?: 'vercel' | 'service_domain' | 'localhost';
    verifiedAt?: number;
};
```

- [ ] **Step 4: Extend the seam contract**

In `packages/db/src/services/service.ts`, add the two backend ops to the `ServiceBackend` interface alongside the existing shop reads/writes (match the existing method-signature style — async functions returning the raw Convex shapes). Wire them to the Convex `db/shops:domainVerification` query and `db/shop_domain_write:setDomainVerification` mutation respectively in the Convex backend implementation.

- [ ] **Step 5: Implement the service methods**

In `packages/db/src/services/shop.ts`, add to the `ShopService` (mirror `findByDomain`'s structure):

```ts
    /**
     * Reads a routable domain's connection state for the admin connect screen, coalescing legacy
     * rows (no stored `status`) to `verified`/`service_domain` — those domains predate verification
     * and are already live. Returns `null` when the domain is unclaimed.
     *
     * @param domain - The normalized customer-facing hostname.
     * @returns The {@link DomainVerification}, or `null` when no routing row exists.
     */
    public async getDomainVerification(domain: string): Promise<DomainVerification | null> {
        const row = await this.backend.domainVerification({ domain });
        if (!row) {
            return null;
        }
        return {
            domain: row.domain,
            status: row.status ?? 'verified',
            via: row.via ?? (row.status ? null : 'service_domain'),
            verifiedAt: row.verifiedAt ?? null,
            lastCheckedAt: row.lastCheckedAt ?? null,
        };
    }

    /**
     * Persists the outcome of a verify attempt onto the routing row. Informational only — never
     * affects routing. No-ops silently at the seam when the domain has no row.
     *
     * @param domain - The normalized customer-facing hostname.
     * @param input - The new status plus optional `via`/`verifiedAt`.
     */
    public async setDomainVerification(domain: string, input: DomainVerificationInput): Promise<void> {
        await this.backend.setDomainVerification({ domain, ...input });
    }
```

> Adjust `this.backend.*` to the file's real backend-access idiom. Import `DomainVerification` / `DomainVerificationInput` from the models barrel.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-db -- shop`
Expected: PASS.

- [ ] **Step 7: Regenerate & verify the seam-contract snapshot**

Run: `pnpm test --project @nordcom/commerce-db -- service-seam-contract`
Expected: FAIL first (snapshot drift from the two new ops). Update the snapshot the way the repo prescribes — prefer a snapshot-update script if one exists (`pnpm test --project @nordcom/commerce-db -- -u`); otherwise hand-edit `service-seam-contract.snapshot.ts` to add the two ops. Re-run until PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/models packages/db/src/services
git commit -m "feat(db): expose getDomainVerification/setDomainVerification on the shop seam."
```

---

## Phase 3 — Admin domain library

### Task 6: Vercel config reader + record targets

**Files:**
- Create: `apps/admin/src/lib/domains/config.ts`
- Create: `apps/admin/src/lib/domains/targets.ts`
- Test: `apps/admin/src/lib/domains/targets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/domains/targets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildRecordInstructions, isLocalhostDomain, VERCEL_A_RECORD, VERCEL_CNAME_TARGET } from './targets';

describe('isLocalhostDomain', () => {
    it('matches *.localhost and bare localhost', () => {
        expect(isLocalhostDomain('hello.localhost')).toBe(true);
        expect(isLocalhostDomain('localhost')).toBe(true);
        expect(isLocalhostDomain('shop.acme.com')).toBe(false);
    });
});

describe('buildRecordInstructions', () => {
    it('shows Vercel records when creds exist', () => {
        const records = buildRecordInstructions({ hasVercel: true, serviceDomain: 'shops.nordcom.io' });
        expect(records).toContainEqual({ kind: 'CNAME', host: 'subdomain', value: VERCEL_CNAME_TARGET });
        expect(records).toContainEqual({ kind: 'A', host: 'apex', value: VERCEL_A_RECORD });
    });

    it('shows SERVICE_DOMAIN CNAME when no Vercel creds', () => {
        const records = buildRecordInstructions({ hasVercel: false, serviceDomain: 'shops.nordcom.io' });
        expect(records).toContainEqual({ kind: 'CNAME', host: 'subdomain', value: 'shops.nordcom.io' });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm build:packages && pnpm test --project @nordcom/commerce-admin -- domains/targets`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `targets.ts`**

Create `apps/admin/src/lib/domains/targets.ts`:

```ts
/** Vercel's documented anycast A record for apex custom domains. */
export const VERCEL_A_RECORD = '76.76.21.21';
/** Vercel's documented CNAME target for subdomain custom domains. */
export const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com';

/** One DNS record the operator should create. `host` distinguishes the apex vs subdomain form. */
export type RecordInstruction = { kind: 'A' | 'CNAME'; host: 'apex' | 'subdomain'; value: string };

/**
 * Whether a hostname is a local-development domain that should auto-verify without any network
 * call. Covers bare `localhost` and any `*.localhost` (portless dev hostnames).
 *
 * @param domain - The normalized hostname.
 * @returns `true` for localhost domains.
 */
export function isLocalhostDomain(domain: string): boolean {
    return domain === 'localhost' || domain.endsWith('.localhost');
}

/**
 * Builds the DNS records to display on the connect screen. With Vercel creds the operator points at
 * Vercel directly (CNAME for a subdomain, A for an apex); without them they CNAME at `SERVICE_DOMAIN`
 * (the wildcard path). Both forms are shown so the operator picks the one matching their domain.
 *
 * @param input.hasVercel - Whether the admin holds Vercel provisioning creds.
 * @param input.serviceDomain - The platform service domain (fallback CNAME target).
 * @returns The records to render.
 */
export function buildRecordInstructions(input: { hasVercel: boolean; serviceDomain: string }): RecordInstruction[] {
    if (input.hasVercel) {
        return [
            { kind: 'CNAME', host: 'subdomain', value: VERCEL_CNAME_TARGET },
            { kind: 'A', host: 'apex', value: VERCEL_A_RECORD },
        ];
    }
    return [{ kind: 'CNAME', host: 'subdomain', value: input.serviceDomain }];
}
```

- [ ] **Step 4: Implement `config.ts`**

Create `apps/admin/src/lib/domains/config.ts`:

```ts
import 'server-only';

/** Resolved Vercel provisioning creds, or `null` when the admin is not wired to a Vercel project. */
export type VercelConfig = { token: string; projectId: string; teamId?: string };

/**
 * Reads the admin's Vercel provisioning creds from the environment. Returns `null` unless BOTH a
 * token and the storefront project id are present, so the verify path cleanly degrades to the DoH
 * DNS check in dev / self-host deployments that never set them.
 *
 * @returns The {@link VercelConfig}, or `null` when provisioning is unavailable.
 */
export function getVercelConfig(): VercelConfig | null {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_STOREFRONT_PROJECT_ID;
    if (!token || !projectId) {
        return null;
    }
    const teamId = process.env.VERCEL_TEAM_ID;
    return { token, projectId, ...(teamId ? { teamId } : {}) };
}

/** Whether Vercel provisioning is configured. @returns `true` when {@link getVercelConfig} is non-null. */
export function hasVercelCreds(): boolean {
    return getVercelConfig() !== null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin -- domains/targets`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/domains/config.ts apps/admin/src/lib/domains/targets.ts apps/admin/src/lib/domains/targets.test.ts
git commit -m "feat(admin): add Vercel config reader and DNS record targets."
```

### Task 7: DoH resolver

**Files:**
- Create: `apps/admin/src/lib/domains/dns.ts`
- Test: `apps/admin/src/lib/domains/dns.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/domains/dns.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDns } from './dns';

afterEach(() => vi.restoreAllMocks());

function mockDoh(payload: unknown, ok = true) {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok,
        json: async () => payload,
    } as Response);
}

describe('resolveDns', () => {
    it('returns normalized CNAME targets (lowercased, trailing dot stripped)', async () => {
        mockDoh({ Answer: [{ name: 'shop.acme.com.', type: 5, data: 'CNAME.Vercel-DNS.com.' }] });
        expect(await resolveDns('shop.acme.com', 'CNAME')).toEqual(['cname.vercel-dns.com']);
    });

    it('returns A records', async () => {
        mockDoh({ Answer: [{ name: 'acme.com.', type: 1, data: '76.76.21.21' }] });
        expect(await resolveDns('acme.com', 'A')).toEqual(['76.76.21.21']);
    });

    it('returns [] when there is no answer (NXDOMAIN)', async () => {
        mockDoh({ Status: 3 });
        expect(await resolveDns('nope.acme.com', 'A')).toEqual([]);
    });

    it('throws on a transport failure (non-200)', async () => {
        mockDoh({}, false);
        await expect(resolveDns('shop.acme.com', 'A')).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin -- domains/dns`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `dns.ts`**

Create `apps/admin/src/lib/domains/dns.ts`:

```ts
import { DomainVerificationError } from '@nordcom/commerce-errors';

/** DNS record type → its numeric code in the Google DoH JSON response. */
const TYPE_CODE: Record<'A' | 'CNAME', number> = { A: 1, CNAME: 5 };

/** One entry of the Google DoH JSON `Answer` array. */
type DohAnswer = { name: string; type: number; data: string };

/**
 * Resolves a hostname's records via the Google DNS-over-HTTPS JSON API. Pure `fetch`, so it works in
 * any runtime and is trivially mocked in tests. CNAME targets are lowercased with the trailing dot
 * stripped for direct comparison against our record targets. An empty / NXDOMAIN answer returns `[]`
 * (a clean "not pointed yet"); a transport-level failure throws so the caller can surface "couldn't
 * check, retry" rather than mislabel the domain as failed.
 *
 * @param name - The hostname to resolve.
 * @param type - `'A'` or `'CNAME'`.
 * @returns The matching record data values, normalized; `[]` when none exist.
 * @throws {DomainVerificationError} When the DoH endpoint returns a non-200 response.
 */
export async function resolveDns(name: string, type: 'A' | 'CNAME'): Promise<string[]> {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    const response = await fetch(url, { headers: { accept: 'application/dns-json' } });
    if (!response.ok) {
        throw new DomainVerificationError(`DNS lookup for ${name} failed (${response.status}).`);
    }
    const body = (await response.json()) as { Answer?: DohAnswer[] };
    const answers = body.Answer ?? [];
    return answers
        .filter((answer) => answer.type === TYPE_CODE[type])
        .map((answer) => answer.data.replace(/\.$/, '').toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin -- domains/dns`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/domains/dns.ts apps/admin/src/lib/domains/dns.test.ts
git commit -m "feat(admin): add DNS-over-HTTPS resolver for domain checks."
```

### Task 8: Vercel REST client

**Files:**
- Create: `apps/admin/src/lib/domains/vercel.ts`
- Test: `apps/admin/src/lib/domains/vercel.test.ts`

> Before implementing, confirm the three endpoints in the "Vercel REST endpoints" section against current Vercel docs (use Context7 / the Vercel REST API reference). Adjust paths/response keys if they have changed; keep the function signatures below stable.

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/domains/vercel.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addProjectDomain, getProjectDomainStatus } from './vercel';

const config = { token: 'tok', projectId: 'prj_1' };
afterEach(() => vi.restoreAllMocks());

function mockFetch(...responses: Array<{ ok: boolean; status: number; body: unknown }>) {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    for (const r of responses) {
        fetchMock.mockResolvedValueOnce({ ok: r.ok, status: r.status, json: async () => r.body } as Response);
    }
    return fetchMock;
}

describe('addProjectDomain', () => {
    it('treats 200 as added', async () => {
        mockFetch({ ok: true, status: 200, body: { name: 'shop.acme.com' } });
        await expect(addProjectDomain(config, 'shop.acme.com')).resolves.toBeUndefined();
    });

    it('treats 409 (already added) as success', async () => {
        mockFetch({ ok: false, status: 409, body: { error: { code: 'domain_already_in_use' } } });
        await expect(addProjectDomain(config, 'shop.acme.com')).resolves.toBeUndefined();
    });

    it('throws on other failures', async () => {
        mockFetch({ ok: false, status: 403, body: { error: { code: 'forbidden' } } });
        await expect(addProjectDomain(config, 'shop.acme.com')).rejects.toThrow();
    });
});

describe('getProjectDomainStatus', () => {
    it('maps verified+config into a status', async () => {
        mockFetch(
            { ok: true, status: 200, body: { verified: true } },
            { ok: true, status: 200, body: { misconfigured: false } },
        );
        expect(await getProjectDomainStatus(config, 'shop.acme.com')).toEqual({ verified: true, misconfigured: false });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin -- domains/vercel`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `vercel.ts`**

Create `apps/admin/src/lib/domains/vercel.ts`:

```ts
import 'server-only';

import { DomainVerificationError } from '@nordcom/commerce-errors';

import type { VercelConfig } from './config';

/** Appends the optional team scope to a Vercel API path. */
function withTeam(path: string, config: VercelConfig): string {
    return config.teamId ? `${path}${path.includes('?') ? '&' : '?'}teamId=${config.teamId}` : path;
}

/** Authorized fetch against the Vercel REST API. */
function vercelFetch(config: VercelConfig, path: string, init?: RequestInit): Promise<Response> {
    return fetch(`https://api.vercel.com${withTeam(path, config)}`, {
        ...init,
        headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json', ...init?.headers },
    });
}

/**
 * Adds a custom domain to the storefront Vercel project (idempotent). A `409` means the domain is
 * already attached — treated as success so a re-run after a partial failure does not throw. Any
 * other non-2xx throws.
 *
 * @param config - The storefront project's Vercel creds.
 * @param domain - The customer-facing hostname to attach.
 * @throws {DomainVerificationError} On a non-2xx, non-409 response.
 */
export async function addProjectDomain(config: VercelConfig, domain: string): Promise<void> {
    const response = await vercelFetch(config, `/v10/projects/${config.projectId}/domains`, {
        method: 'POST',
        body: JSON.stringify({ name: domain }),
    });
    if (response.ok || response.status === 409) {
        return;
    }
    throw new DomainVerificationError(`Vercel rejected adding ${domain} (${response.status}).`);
}

/**
 * Reads Vercel's view of a project domain: whether Vercel has verified ownership and whether its DNS
 * is currently misconfigured. The connect screen renders `verified && !misconfigured` as connected.
 *
 * @param config - The storefront project's Vercel creds.
 * @param domain - The customer-facing hostname.
 * @returns `{ verified, misconfigured }`.
 * @throws {DomainVerificationError} When either Vercel call fails.
 */
export async function getProjectDomainStatus(
    config: VercelConfig,
    domain: string,
): Promise<{ verified: boolean; misconfigured: boolean }> {
    const domainResponse = await vercelFetch(config, `/v9/projects/${config.projectId}/domains/${domain}`);
    if (!domainResponse.ok) {
        throw new DomainVerificationError(`Vercel domain lookup for ${domain} failed (${domainResponse.status}).`);
    }
    const verified = Boolean(((await domainResponse.json()) as { verified?: boolean }).verified);

    const configResponse = await vercelFetch(config, `/v6/domains/${domain}/config`);
    if (!configResponse.ok) {
        throw new DomainVerificationError(`Vercel config lookup for ${domain} failed (${configResponse.status}).`);
    }
    const misconfigured = Boolean(((await configResponse.json()) as { misconfigured?: boolean }).misconfigured);

    return { verified, misconfigured };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin -- domains/vercel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/domains/vercel.ts apps/admin/src/lib/domains/vercel.test.ts
git commit -m "feat(admin): add Vercel REST client for domain provisioning."
```

### Task 9: DNS-path connection check (orchestrator)

**Files:**
- Create: `apps/admin/src/lib/domains/verify.ts`
- Test: `apps/admin/src/lib/domains/verify.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/domains/verify.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as dns from './dns';
import { checkDomainConnection } from './verify';

afterEach(() => vi.restoreAllMocks());

describe('checkDomainConnection', () => {
    it('accepts a CNAME at Vercel', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (_n, t) =>
            t === 'CNAME' ? ['cname.vercel-dns.com'] : [],
        );
        expect(await checkDomainConnection({ domain: 'shop.acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: true,
            via: 'vercel',
        });
    });

    it('accepts a CNAME at SERVICE_DOMAIN', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (_n, t) =>
            t === 'CNAME' ? ['shops.nordcom.io'] : [],
        );
        expect(await checkDomainConnection({ domain: 'shop.acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: true,
            via: 'service_domain',
        });
    });

    it('accepts an apex A record at Vercel', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (n, t) => {
            if (t === 'A' && n === 'acme.com') return ['76.76.21.21'];
            return [];
        });
        expect(await checkDomainConnection({ domain: 'acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: true,
            via: 'vercel',
        });
    });

    it('reports not connected when nothing points at us', async () => {
        vi.spyOn(dns, 'resolveDns').mockResolvedValue(['1.2.3.4']);
        expect(await checkDomainConnection({ domain: 'shop.acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: false,
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin -- domains/verify`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `verify.ts`**

Create `apps/admin/src/lib/domains/verify.ts`:

```ts
import { resolveDns } from './dns';
import { VERCEL_A_RECORD, VERCEL_CNAME_TARGET } from './targets';

/** Outcome of a DNS-path connection check. `via` is set only when `connected`. */
export type ConnectionResult = { connected: true; via: 'vercel' | 'service_domain' } | { connected: false };

/** Whether a CNAME target is Vercel's (exact or any `*.vercel-dns.com`). */
function isVercelCname(target: string): boolean {
    return target === VERCEL_CNAME_TARGET || target.endsWith('.vercel-dns.com');
}

/** Whether a CNAME target points at SERVICE_DOMAIN (exact or a subdomain of it). */
function isServiceCname(target: string, serviceDomain: string): boolean {
    return target === serviceDomain || target.endsWith(`.${serviceDomain}`);
}

/**
 * DNS-path connection check (the no-Vercel-creds fallback, and a confirming signal even when Vercel
 * is configured). Resolves the domain's CNAME and A records and accepts EITHER record type pointing
 * at a Vercel target OR at `SERVICE_DOMAIN` — so apex (A) and subdomain (CNAME) both verify without
 * any apex detection. Vercel is preferred over `SERVICE_DOMAIN` when both somehow match.
 *
 * @param input.domain - The normalized customer-facing hostname.
 * @param input.serviceDomain - The platform service domain.
 * @returns `{ connected, via }`.
 * @throws {DomainVerificationError} Propagated from {@link resolveDns} on a DoH transport failure.
 */
export async function checkDomainConnection(input: { domain: string; serviceDomain: string }): Promise<ConnectionResult> {
    const { domain, serviceDomain } = input;
    const [cnames, aRecords, serviceIps] = await Promise.all([
        resolveDns(domain, 'CNAME'),
        resolveDns(domain, 'A'),
        resolveDns(serviceDomain, 'A'),
    ]);

    if (cnames.some(isVercelCname) || aRecords.includes(VERCEL_A_RECORD)) {
        return { connected: true, via: 'vercel' };
    }
    const serviceIpSet = new Set(serviceIps);
    if (cnames.some((t) => isServiceCname(t, serviceDomain)) || aRecords.some((ip) => serviceIpSet.has(ip))) {
        return { connected: true, via: 'service_domain' };
    }
    return { connected: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin -- domains/verify`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/domains/verify.ts apps/admin/src/lib/domains/verify.test.ts
git commit -m "feat(admin): add DNS-path domain connection check."
```

---

## Phase 4 — Admin server action

### Task 10: `verifyDomain` server action

**Files:**
- Create: `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/actions.ts`
- Test: `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/actions.test.ts`

> Authorization: reuse the same admin/collaborator guard sibling settings actions use (e.g. `getAuthedCmsCtx(domain)`). Verify the caller is a collaborator on `domain` before touching its routing row — the Convex mutation is identity-less, so the action is the authorization boundary.

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/actions.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cms-ctx', () => ({ getAuthedCmsCtx: vi.fn(async () => ({ user: { role: 'admin' } })) }));
const setDomainVerification = vi.fn(async () => undefined);
vi.mock('@nordcom/commerce-db', () => ({ Shop: { setDomainVerification: (...a: unknown[]) => setDomainVerification(...a) } }));
vi.mock('../../../../../../lib/domains/config', () => ({ getVercelConfig: vi.fn(() => null) }));
const checkDomainConnection = vi.fn();
vi.mock('../../../../../../lib/domains/verify', () => ({ checkDomainConnection: (...a: unknown[]) => checkDomainConnection(...a) }));

import { verifyDomain } from './actions';

afterEach(() => vi.clearAllMocks());

describe('verifyDomain', () => {
    it('auto-verifies a localhost domain without any network call', async () => {
        const result = await verifyDomain('hello.localhost');
        expect(result).toEqual({ status: 'verified', via: 'localhost' });
        expect(checkDomainConnection).not.toHaveBeenCalled();
        expect(setDomainVerification).toHaveBeenCalledWith('hello.localhost', expect.objectContaining({ status: 'verified', via: 'localhost' }));
    });

    it('persists verified when the DNS fallback says connected', async () => {
        process.env.SERVICE_DOMAIN = 'shops.nordcom.io';
        checkDomainConnection.mockResolvedValue({ connected: true, via: 'service_domain' });
        const result = await verifyDomain('shop.acme.com');
        expect(result).toMatchObject({ status: 'verified', via: 'service_domain' });
        expect(setDomainVerification).toHaveBeenCalledWith('shop.acme.com', expect.objectContaining({ status: 'verified', via: 'service_domain' }));
    });

    it('persists failed when not connected', async () => {
        process.env.SERVICE_DOMAIN = 'shops.nordcom.io';
        checkDomainConnection.mockResolvedValue({ connected: false });
        const result = await verifyDomain('shop.acme.com');
        expect(result).toMatchObject({ status: 'failed' });
    });
});
```

> Adjust the relative `vi.mock` paths to match the real depth from this file to `apps/admin/src/lib/domains/*`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin -- settings/domain/actions`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `actions.ts`**

Create the file:

```ts
'use server';

import 'server-only';

import { Shop } from '@nordcom/commerce-db';

import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { getVercelConfig } from '@/lib/domains/config';
import { isLocalhostDomain } from '@/lib/domains/targets';
import { addProjectDomain, getProjectDomainStatus } from '@/lib/domains/vercel';
import { checkDomainConnection } from '@/lib/domains/verify';

/** Result of a verify attempt, surfaced to the connect panel. */
export type VerifyDomainResult = {
    status: 'pending' | 'verified' | 'failed';
    via?: 'vercel' | 'service_domain' | 'localhost';
    error?: string;
};

/**
 * Runs a connection check for a shop's customer-facing domain and persists the outcome on its routing
 * row. `*.localhost` auto-verifies (dev). With Vercel creds it ensures the domain is attached to the
 * storefront project, then reads Vercel's verified/misconfigured view; otherwise it falls back to the
 * DoH DNS check. The result is informational — routing is never gated on it.
 *
 * @param domain - The shop's normalized customer-facing hostname (the route's `[domain]`).
 * @returns The new {@link VerifyDomainResult}.
 */
export async function verifyDomain(domain: string): Promise<VerifyDomainResult> {
    await getAuthedCmsCtx(domain); // authorization: collaborator-gates the route's shop.

    if (isLocalhostDomain(domain)) {
        await Shop.setDomainVerification(domain, { status: 'verified', via: 'localhost', verifiedAt: Date.now() });
        return { status: 'verified', via: 'localhost' };
    }

    const serviceDomain = process.env.SERVICE_DOMAIN ?? '';
    const vercel = getVercelConfig();

    try {
        if (vercel) {
            await addProjectDomain(vercel, domain);
            const { verified, misconfigured } = await getProjectDomainStatus(vercel, domain);
            if (verified && !misconfigured) {
                await Shop.setDomainVerification(domain, { status: 'verified', via: 'vercel', verifiedAt: Date.now() });
                return { status: 'verified', via: 'vercel' };
            }
            // Vercel not done yet — fall through to a DNS read so a SERVICE_DOMAIN CNAME still counts.
        }

        const result = await checkDomainConnection({ domain, serviceDomain });
        if (result.connected) {
            await Shop.setDomainVerification(domain, { status: 'verified', via: result.via, verifiedAt: Date.now() });
            return { status: 'verified', via: result.via };
        }
        await Shop.setDomainVerification(domain, { status: 'pending' });
        return { status: 'pending' };
    } catch (error) {
        await Shop.setDomainVerification(domain, { status: 'failed' });
        return { status: 'failed', error: error instanceof Error ? error.message : 'Verification failed.' };
    }
}
```

> Decision baked in: a not-yet-pointed domain persists `pending` (operator keeps polling); only a hard error (DoH/Vercel transport failure) persists `failed`. Matches the auto-poll UX.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin -- settings/domain/actions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/actions.ts" "apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/actions.test.ts"
git commit -m "feat(admin): add verifyDomain server action (Vercel + DNS fallback)."
```

---

## Phase 5 — Admin connect UI

### Task 11: Client connect panel

**Files:**
- Create: `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/connect-panel.tsx`
- Test: `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/connect-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `connect-panel.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectPanel } from './connect-panel';
import type { RecordInstruction } from '@/lib/domains/targets';

const records: RecordInstruction[] = [{ kind: 'CNAME', host: 'subdomain', value: 'cname.vercel-dns.com' }];
afterEach(() => vi.restoreAllMocks());

describe('ConnectPanel', () => {
    it('shows the records and the initial status', () => {
        render(<ConnectPanel domain="shop.acme.com" initialStatus="pending" records={records} onVerify={vi.fn(async () => ({ status: 'pending' }))} />);
        expect(screen.getByText('cname.vercel-dns.com')).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('flips to verified after a successful verify click', async () => {
        const onVerify = vi.fn(async () => ({ status: 'verified' as const, via: 'vercel' as const }));
        render(<ConnectPanel domain="shop.acme.com" initialStatus="pending" records={records} onVerify={onVerify} />);
        fireEvent.click(screen.getByRole('button', { name: /verify/i }));
        await waitFor(() => expect(screen.getByText(/verified/i)).toBeInTheDocument());
        expect(onVerify).toHaveBeenCalledWith('shop.acme.com');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin -- settings/domain/connect-panel`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `connect-panel.tsx`**

Create the file. The `onVerify` prop is the bound `verifyDomain` server action passed from the page, so the client never imports server code. Auto-poll runs only while `pending`, capped (12 ticks × 10s ≈ 2 min).

```tsx
'use client';

import { Button } from '@nordcom/nordstar';
import { Check, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RecordInstruction } from '@/lib/domains/targets';

/** A status the panel can render. */
type Status = 'pending' | 'verified' | 'failed';

/** Props for {@link ConnectPanel}. */
export type ConnectPanelProps = {
    /** The shop's customer-facing domain. */
    domain: string;
    /** Server-read starting status. */
    initialStatus: Status;
    /** DNS records to display. */
    records: RecordInstruction[];
    /** Bound `verifyDomain` server action. */
    onVerify: (domain: string) => Promise<{ status: Status; via?: string; error?: string }>;
};

/** Max auto-poll ticks (× POLL_MS) before the panel stops polling on its own. */
const POLL_CAP = 12;
/** Auto-poll interval in ms. */
const POLL_MS = 10_000;

/**
 * Domain connect/verify panel: renders the DNS records to add, a live status badge, and a Verify
 * button. While `pending`, it auto-polls the bound verify action (capped) so the badge flips to
 * verified as DNS propagates without the operator re-clicking. Routing is never gated on this — the
 * panel is purely operator feedback.
 *
 * @param props - {@link ConnectPanelProps}.
 * @returns The connect panel UI.
 */
export function ConnectPanel({ domain, initialStatus, records, onVerify }: ConnectPanelProps): React.JSX.Element {
    const [status, setStatus] = useState<Status>(initialStatus);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ticks = useRef(0);

    const runVerify = useCallback(async (): Promise<Status> => {
        setChecking(true);
        setError(null);
        try {
            const result = await onVerify(domain);
            setStatus(result.status);
            if (result.error) setError(result.error);
            return result.status;
        } finally {
            setChecking(false);
        }
    }, [domain, onVerify]);

    useEffect(() => {
        if (status !== 'pending') return;
        ticks.current = 0;
        const id = setInterval(async () => {
            ticks.current += 1;
            if (ticks.current > POLL_CAP) {
                clearInterval(id);
                return;
            }
            const next = await runVerify();
            if (next !== 'pending') clearInterval(id);
        }, POLL_MS);
        return () => clearInterval(id);
    }, [status, runVerify]);

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
                <h2 className="font-bold text-sm uppercase tracking-wide">DNS records</h2>
                <p className="text-muted-foreground text-sm">
                    Add one of these at your DNS provider for <span className="font-semibold">{domain}</span>.
                </p>
                <ul className="flex flex-col gap-2">
                    {records.map((record) => (
                        <li
                            key={`${record.kind}-${record.host}`}
                            className="flex items-center justify-between gap-4 rounded-lg border-3 border-border border-solid px-4 py-3"
                        >
                            <span className="font-mono text-xs">
                                {record.kind} · {record.host}
                            </span>
                            <span className="font-mono text-sm">{record.value}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="flex items-center justify-between gap-4">
                <StatusBadge status={status} checking={checking} />
                <Button variant="solid" color="primary" onClick={runVerify} disabled={checking}>
                    {checking ? 'Checking…' : 'Verify now'}
                </Button>
            </section>
            {error ? <p className="text-destructive-foreground text-sm">{error}</p> : null}
        </div>
    );
}

/** Props for {@link StatusBadge}. */
type StatusBadgeProps = { status: Status; checking: boolean };

/**
 * Inline status badge for the connect panel.
 *
 * @param props - {@link StatusBadgeProps}.
 * @returns The badge.
 */
function StatusBadge({ status, checking }: StatusBadgeProps): React.JSX.Element {
    if (checking) {
        return (
            <span className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking…
            </span>
        );
    }
    if (status === 'verified') {
        return (
            <span className="flex items-center gap-2 text-primary text-sm">
                <Check className="size-4" aria-hidden="true" /> Verified
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className="flex items-center gap-2 text-destructive-foreground text-sm">
                <X className="size-4" aria-hidden="true" /> Verification failed
            </span>
        );
    }
    return <span className="text-muted-foreground text-sm">Pending — not yet connected</span>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin -- settings/domain/connect-panel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/connect-panel.tsx" "apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/connect-panel.test.tsx"
git commit -m "feat(admin): add the domain connect panel with auto-poll."
```

### Task 12: Server page wiring

**Files:**
- Create: `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/page.tsx`

- [ ] **Step 1: Implement the page**

Create the file. It reads the current status via the seam, builds records via `buildRecordInstructions`, and passes the bound `verifyDomain` action into the client panel. (No new test file — behavior is covered by the panel + action tests; a thin server wrapper is verified by typecheck/lint.)

```tsx
import 'server-only';

import type { Metadata } from 'next';

import { Shop } from '@nordcom/commerce-db';

import { getVercelConfig } from '@/lib/domains/config';
import { buildRecordInstructions } from '@/lib/domains/targets';
import { verifyDomain } from './actions';
import { ConnectPanel } from './connect-panel';

export const metadata: Metadata = { title: 'Domain' };

type Props = { params: Promise<{ domain: string }> };

/**
 * Settings → Domain page: shows the DNS records to point a shop's customer-facing domain at the
 * platform and a live verify panel. Server-reads the current connection status; the records reflect
 * whether the deployment can provision on Vercel or only supports the `SERVICE_DOMAIN` CNAME path.
 *
 * @param props - Route params carrying `[domain]`.
 * @returns The domain settings page.
 */
export default async function DomainSettingsPage({ params }: Props): Promise<React.JSX.Element> {
    const { domain } = await params;
    const verification = await Shop.getDomainVerification(domain);
    const serviceDomain = process.env.SERVICE_DOMAIN ?? '';
    const records = buildRecordInstructions({ hasVercel: getVercelConfig() !== null, serviceDomain });

    return (
        <main className="flex flex-col gap-6 p-6">
            <header className="flex flex-col gap-1">
                <h1 className="font-bold text-2xl">Domain</h1>
                <p className="text-muted-foreground">Connect {domain} to your storefront.</p>
            </header>
            <ConnectPanel
                domain={domain}
                initialStatus={verification?.status ?? 'pending'}
                records={records}
                onVerify={verifyDomain}
            />
        </main>
    );
}
```

> `getVercelConfig` is `server-only`; importing it here (a Server Component) is fine. Do not import it from the client panel.

- [ ] **Step 2: Verify it typechecks and lints**

Run: `pnpm build:packages && pnpm typecheck --filter @nordcom/commerce-admin && pnpm lint --filter @nordcom/commerce-admin`
Expected: PASS. Then check LSP diagnostics on the new file and fix any errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/admin/src/app/(app)/(dashboard)/[domain]/settings/domain/page.tsx"
git commit -m "feat(admin): add the Settings → Domain page."
```

### Task 13: Subnav link

**Files:**
- Modify: `apps/admin/src/app/(app)/(dashboard)/[domain]/@subnav/settings/default.tsx:26`

- [ ] **Step 1: Add the nav item**

Inside the `isAdmin` block, add a `Domain` link after `Shop`:

```tsx
                    <NavItem href={`${base}/shop/` as Route}>Shop</NavItem>
                    <NavItem href={`${base}/domain/` as Route}>Domain</NavItem>
                    <NavItem href={`${base}/theme/` as Route}>Theme</NavItem>
```

- [ ] **Step 2: Verify lint/typecheck**

Run: `pnpm typecheck --filter @nordcom/commerce-admin && pnpm lint --filter @nordcom/commerce-admin`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/admin/src/app/(app)/(dashboard)/[domain]/@subnav/settings/default.tsx"
git commit -m "feat(admin): link the Domain settings page in the settings subnav."
```

---

## Phase 6 — Wizard redirect, env, docs

### Task 14: Redirect the wizard to the connect screen

**Files:**
- Modify: `apps/admin/src/app/(app)/(setup)/new/actions.ts:137`
- Modify: `apps/admin/src/app/(app)/(setup)/new/actions.test.ts` (or `wizard.test.tsx`) — wherever the redirect target is asserted

- [ ] **Step 1: Update the redirect assertion in the test**

Find the existing test that asserts `createShop` redirects to `/${createdDomain}/` and change the expectation to `/${createdDomain}/settings/domain/`:

```ts
expect(redirect).toHaveBeenCalledWith('/shop.acme.com/settings/domain/');
```

> If no redirect-target assertion exists, add one to the existing successful-create test using the same `redirect` mock the suite already sets up.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin -- new/actions`
Expected: FAIL — still redirects to `/${createdDomain}/`.

- [ ] **Step 3: Change the redirect**

In `actions.ts`, update line 137:

```ts
    redirect(`/${createdDomain}/settings/domain/` as Route);
```

Update the `createShop` JSDoc sentence "redirects to the new dashboard" → "redirects to the new shop's Domain settings screen so the operator can connect DNS."

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin -- new/actions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/admin/src/app/(app)/(setup)/new/actions.ts" "apps/admin/src/app/(app)/(setup)/new/actions.test.ts"
git commit -m "feat(admin): send the new-shop wizard to the domain connect screen."
```

### Task 15: Env + docs

**Files:**
- Modify: `.env.example`, `apps/admin/.env.example`
- Modify: `apps/docs/content/operations/deployment.mdx`

- [ ] **Step 1: Add env vars**

Add to `.env.example` and `apps/admin/.env.example` (admin only — the storefront does not provision):

```bash
# Vercel domain provisioning (admin only). When unset, the connect screen falls back to a
# DNS-over-HTTPS check against SERVICE_DOMAIN instead of adding domains to the Vercel project.
VERCEL_TOKEN=
VERCEL_STOREFRONT_PROJECT_ID=
# Optional: set when the storefront project lives under a Vercel team.
VERCEL_TEAM_ID=
```

- [ ] **Step 2: Document the connect flow**

In `apps/docs/content/operations/deployment.mdx`, near the `SERVICE_DOMAIN` description, add a short subsection: operators connect a custom domain on **Settings → Domain**; with `VERCEL_TOKEN` + `VERCEL_STOREFRONT_PROJECT_ID` set, the admin adds the domain to the storefront project and verifies via Vercel; otherwise it verifies that the domain's DNS points at `SERVICE_DOMAIN` (CNAME) or Vercel (`cname.vercel-dns.com` / `76.76.21.21`). `*.localhost` auto-verifies in dev.

- [ ] **Step 3: Commit**

```bash
git add .env.example apps/admin/.env.example apps/docs/content/operations/deployment.mdx
git commit -m "docs: document Vercel domain-provisioning env and the connect flow."
```

---

## Phase 7 — Full verification

### Task 16: Whole-suite gate

- [ ] **Step 1: Build packages, typecheck, lint**

Run: `pnpm build:packages && pnpm typecheck && pnpm lint`
Expected: PASS across the workspace.

- [ ] **Step 2: Run the affected package suites**

Run:
```bash
pnpm test --project @nordcom/commerce-errors
pnpm test --project @nordcom/commerce-convex
pnpm test --project @nordcom/commerce-db
pnpm test --project @nordcom/commerce-admin
```
Expected: PASS.

- [ ] **Step 3: Run the limit-boundary Convex gate (touched `packages/convex/**`)**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/limits`
Expected: PASS — confirms the schema change didn't break limit boundaries.

- [ ] **Step 4: Confirm no changeset is required**

`.changeset/config.json` ignores all `@nordcom/*` except `@nordcom/cart-*`; this feature touches none of those, so **no changeset**. Confirm `git status` shows no unintended package changes outside the planned set.

- [ ] **Step 5: Final commit (only if Step 1–3 produced fixups)**

```bash
git add -A
git commit -m "test(admin): finalize domain-connection verification suite."
```

---

## Self-Review notes (carried from spec)

- **Localhost bypass** — enforced in `verifyDomain` (Task 10) via `isLocalhostDomain`; auto-verifies, no network call. ✔
- **No routing gate** — `findByDomain` / middleware untouched; only reads added are admin-side. ✔
- **No backfill** — legacy `undefined` status coalesces to `verified`/`service_domain` in the seam (Task 5); new rows insert `pending` (Task 2). ✔
- **Hybrid mechanism** — Vercel provisioning when creds present, DoH fallback otherwise, both reachable in `verifyDomain` (Task 10). ✔
- **Apex + subdomain** — `checkDomainConnection` accepts CNAME or A; panel shows both records. ✔
- **Type consistency** — `Status`/`status` ∈ {`pending`,`verified`,`failed`}; `via` ∈ {`vercel`,`service_domain`,`localhost`}; `VerifyDomainResult` ↔ `ConnectPanel` `onVerify` return ↔ seam `DomainVerificationInput` all aligned. ✔
- **Open implementation check** — confirm the three Vercel REST endpoints against current docs at Task 8 (paths/response keys); function signatures stay stable.

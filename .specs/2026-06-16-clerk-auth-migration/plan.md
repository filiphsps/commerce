# Clerk Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace admin's NextAuth v5 + custom RS256→Convex auth with Clerk, using Clerk Organizations as the multi-tenant model, preserving `/[domain]/` per-shop routing and the Convex authorization seam.

**Architecture:** Clerk owns identity/sessions/login-methods and Organizations (org = team, owns N storefronts). Convex validates Clerk JWTs natively (`auth.config.ts` domain), with `orgs`/`orgMemberships` mirror tables synced from Clerk webhooks and fanned out into the existing `shopCollaborators` projection so existing queries are unchanged. The `/[domain]/` URL stays the tenant selector; the active Clerk org is synced to the routed shop's owning org. User provisioning is webhook-driven (svix httpAction) with a lazy mutation safety net.

**Tech Stack:** Next.js 16 App Router, `@clerk/nextjs`, `@clerk/testing`, Convex (`convex/react-clerk`, httpAction, svix), Nordstar design system, Playwright, pnpm workspaces + Turbo, Biome.

**Spec:** `.specs/2026-06-16-clerk-auth-migration/spec.md` (read first — decision log is authoritative).

**Conventions (CLAUDE.md — non-negotiable):** JSDoc on every fn/component; throw via `@nordcom/commerce-errors`; `noUncheckedIndexedAccess` (no `!`); American English; Server Components by default; no unused vars/underscore-suppression; env-tier gates via `@nordcom/commerce-utils`; run `pnpm build:packages` before lint/typecheck/test in a fresh worktree; check LSP diagnostics after edits; changeset for any non-ignored package.

---

## Pre-flight (run once at execution start)

- [ ] **P0: Build packages + baseline.** Apps import workspace packages from `dist/`.

Run:
```bash
pnpm install
pnpm build:packages
pnpm --filter @nordcom/commerce-admin typecheck
```
Expected: install + build succeed; admin typecheck passes on the untouched baseline. If baseline typecheck fails, STOP and report.

- [ ] **P0b: Confirm Clerk CLI + non-interactive auth mechanism (spec open item #1).**

Run:
```bash
npx clerk@latest --help
npx clerk@latest auth --help
npx clerk@latest config --help
npx clerk@latest api --help
```
Record: the exact non-interactive CI-auth path. Decision rule — if a first-class CI login token env var exists, use it; otherwise apply prod config in CI via `clerk api` / Clerk Backend REST authenticated with the prod `CLERK_SECRET_KEY`. Write the confirmed mechanism into the spec's "Clerk CLI provisioning" section before Phase 9.

---

## File Structure

**Created**
- `apps/admin/src/middleware.ts` — `clerkMiddleware()` (admin had none; route-level `auth()` today).
- `apps/admin/src/lib/clerk-appearance.ts` — Clerk `appearance` mapped to Nordstar tokens.
- `apps/admin/src/components/providers/clerk-convex-provider.tsx` — `'use client'` `<ConvexProviderWithClerk>`.
- `apps/admin/src/app/(app)/(auth)/sign-in/[[...sign-in]]/page.tsx` — themed `<SignIn/>` in `AuthShell`.
- `apps/admin/src/app/(app)/(auth)/sign-up/[[...sign-up]]/page.tsx` — themed `<SignUp/>` in `AuthShell`.
- `apps/admin/src/lib/clerk-convex-token.ts` — server `getToken({template:'convex'})` → `ConvexHttpClient.setAuth`.
- `apps/admin/src/app/(app)/(setup)/onboarding/page.tsx` — `<CreateOrganization/>` step.
- `apps/admin/src/components/org-storefront-chooser.tsx` — bespoke grouped chooser.
- `packages/convex/convex/tables/orgs.ts` — `orgs` + `orgMemberships` mirror validators.
- `packages/convex/convex/clerk/webhooks.ts` — sync handlers (user/org/membership) + fan-out projection.
- `packages/convex/convex/clerk/sync.ts` — pure projection helpers (membership × org's shops → `shopCollaborators`).
- `packages/convex/convex/account/self.ts` add `ensureCurrentUser` mutation (file may exist; extend).
- `clerk/clerk.config.json` (or `clerk config pull` output path) — committed config-as-code.
- `apps/admin/e2e/support/clerk.ts` — `@clerk/testing` helpers.
- `.changeset/clerk-auth-migration.md`.

**Modified**
- `packages/convex/convex/schema.ts` — register `orgs`/`orgMemberships`, drop `sessions`/`identities`.
- `packages/convex/convex/tables/auth.ts` — `users` gains `clerkUserId` + `by_clerk_user_id`; drop embedded `identities[]`, drop `sessions`/`identities` tables.
- `packages/convex/convex/tables/shops.ts` — `shops` gains `clerkOrgId` + `by_clerk_org`.
- `packages/convex/convex/auth.config.ts` — Clerk provider `{domain: CLERK_FRONTEND_API_URL, applicationID:'convex'}`.
- `packages/convex/convex/lib/auth.ts` — `resolveUserFromIdentity` (subject→email fallback+backfill); `resolveShopAccess(domain)` replacing `resolveAdminShopId` (org_id match).
- `packages/convex/convex/db/users.ts` — `upsertFromClerk` mutation; keep `create` only if still used.
- `packages/convex/convex/http.ts` — route `POST /clerk-webhooks` → `clerk/webhooks`.
- `packages/convex/convex/db/shop_write.ts` — `upsertShop` writes `shops.clerkOrgId`; backfill collaborators for org members on shop insert.
- `apps/admin/src/app/(app)/layout.tsx` + `providers.tsx` — wrap `<ClerkProvider>` + Clerk-Convex provider; Montserrat/appearance.
- `apps/admin/src/app/(app)/page.tsx` — render `OrgStorefrontChooser`.
- `apps/admin/src/components/shell/shell-header.tsx` + `account-menu.tsx` — `<UserButton/>` / `<OrganizationSwitcher/>`.
- `apps/admin/src/lib/convex-auth.ts` + `cms-ctx.ts` + `account-convex.ts` — read Clerk session, mint via `getToken`.
- `apps/admin/src/app/(app)/(setup)/new/actions.ts` — set active org / write `clerkOrgId` on shop create.
- `apps/admin/e2e/global-setup.ts` — Clerk testing setup + seed orgs/memberships.
- `apps/admin/package.json` — `-next-auth -@auth/core +@clerk/nextjs +@clerk/testing`.
- `.env.example` — remove legacy auth vars; add Clerk vars.
- `.github/workflows/ci.yml` + `deploy.yml` — Clerk env, e2e keys, prod config job, Convex env push.
- `apps/landing/**` — "Sign in" link → admin sign-in URL.

**Deleted**
- `apps/admin/src/utils/auth.ts`, `auth.config.ts`, `auth.adapter.ts`
- `apps/admin/src/auth.ts`
- `apps/admin/src/app/api/auth/[...nextauth]/route.ts`
- `apps/admin/src/app/.well-known/jwks.json/route.ts`
- `apps/admin/src/lib/convex-token.ts`
- `apps/admin/src/components/login-button.tsx`
- `apps/admin/src/app/(app)/(auth)/auth/login/page.tsx` + `…/logout/page.tsx`

---

## Phase 0 — Dependencies & Clerk dev provisioning

### Task 0.1: Swap auth dependencies

**Files:** Modify `apps/admin/package.json`

- [ ] **Step 1: Replace deps**

```bash
cd apps/admin
pnpm remove next-auth @auth/core
pnpm add @clerk/nextjs
pnpm add -D @clerk/testing
cd ../..
pnpm install
```
`convex` already provides `convex/react-clerk`. `svix` is needed Convex-side — add in Task 3.1.

- [ ] **Step 2: Verify** — `pnpm --filter @nordcom/commerce-admin typecheck` now fails ONLY on missing `@/auth`/next-auth imports (expected; fixed in later phases). Record the failing import sites — they are the migration checklist.

- [ ] **Step 3: Commit**
```bash
git add apps/admin/package.json pnpm-lock.yaml
git commit -m "build(admin): swap next-auth for @clerk/nextjs."
```

### Task 0.2: Provision the Clerk DEV instance (agent) + commit config-as-code

**Files:** Create `clerk/clerk.config.json` (path per `clerk config pull`)

- [ ] **Step 1: Create/link the dev app** (uses Clerk shared dev OAuth — no provider apps needed)
```bash
npx clerk@latest apps create --mode agent --input-json '{"name":"nordcom-commerce-admin"}' || npx clerk@latest link
```
- [ ] **Step 2: Apply config** — enable Organizations + "members can belong to multiple orgs"; enable GitHub, Google, Email-code; account-linking-by-verified-email ON; create the `convex` JWT template; add Shopify custom-OAuth connection as a disabled placeholder. Prefer `clerk config patch --input-json @clerk/clerk.config.json`; if config-as-code keys differ, apply via `clerk api` Backend calls. The `convex` JWT template claims:
```json
{ "email": "{{user.primary_email_address}}" }
```
(Clerk injects `org_id`/`org_role`/`org_slug` automatically when an org is active.)
- [ ] **Step 3: Pull + commit config-as-code**
```bash
npx clerk@latest config pull > clerk/clerk.config.json
git add clerk/clerk.config.json
git commit -m "chore(clerk): commit dev instance config-as-code."
```
- [ ] **Step 4: Capture dev keys** into local `.env.local` (NOT committed): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL`, and a webhook signing secret placeholder. Set Convex dev deployment vars:
```bash
npx convex env set CLERK_FRONTEND_API_URL "<dev frontend api url>"
npx convex env set CLERK_WEBHOOK_SIGNING_SECRET "<dev webhook secret>"
```

---

## Phase 1 — Convex schema (TDD with `convex-test`)

### Task 1.1: Add `clerkUserId` to `users`, drop embedded identities

**Files:** Modify `packages/convex/convex/tables/auth.ts`; Test `packages/convex/convex/tables/auth.test.ts` (create if absent)

- [ ] **Step 1: Write failing test** — a `users` doc accepts `clerkUserId` and is queryable by `by_clerk_user_id`.
```ts
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../schema';
import { api } from '../_generated/api';

test('users row is resolvable by clerkUserId', async () => {
    const t = convexTest(schema);
    const id = await t.run(async (ctx) =>
        ctx.db.insert('users', {
            email: 'a@b.com', name: 'A', clerkUserId: 'user_123',
            createdAt: 0, updatedAt: 0,
        }),
    );
    const found = await t.run(async (ctx) =>
        ctx.db.query('users').withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', 'user_123')).unique(),
    );
    expect(found?._id).toEqual(id);
});
```
- [ ] **Step 2: Run → FAIL** `pnpm --filter @nordcom/commerce-convex test src/tables` (or the package's test script) — fails: `clerkUserId` not in validator / index missing.
- [ ] **Step 3: Implement** — in `tables/auth.ts` add `clerkUserId: v.optional(v.string())` to the `users` validator, add `.index('by_clerk_user_id', ['clerkUserId'])`, and remove the embedded `identities` field. Keep `email`, `by_email`, `name`, `avatar`, `emailVerified`, `groups`, `preferences`, `createdAt`, `updatedAt`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `git commit -am "feat(convex): add users.clerkUserId, drop embedded identities."`

### Task 1.2: Add `orgs` + `orgMemberships` mirror tables

**Files:** Create `packages/convex/convex/tables/orgs.ts`; Modify `packages/convex/convex/schema.ts`; Test `packages/convex/convex/tables/orgs.test.ts`

- [ ] **Step 1: Write failing test** — insert an org + membership; query memberships `by_user` and `by_clerk_org`.
```ts
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../schema';

test('org membership is queryable by user and by org', async () => {
    const t = convexTest(schema);
    const { user, org } = await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', { email: 'a@b.com', name: 'A', clerkUserId: 'user_1', createdAt: 0, updatedAt: 0 });
        await ctx.db.insert('orgs', { clerkOrgId: 'org_1', name: 'Acme', slug: 'acme', createdAt: 0, updatedAt: 0 });
        await ctx.db.insert('orgMemberships', { clerkOrgId: 'org_1', user, clerkUserId: 'user_1', role: 'org:admin', createdAt: 0 });
        return { user, org: 'org_1' };
    });
    const byUser = await t.run((ctx) => ctx.db.query('orgMemberships').withIndex('by_user', (q) => q.eq('user', user)).collect());
    const byOrg = await t.run((ctx) => ctx.db.query('orgMemberships').withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', org)).collect());
    expect(byUser).toHaveLength(1);
    expect(byOrg).toHaveLength(1);
});
```
- [ ] **Step 2: Run → FAIL** (tables unknown).
- [ ] **Step 3: Implement** `tables/orgs.ts`:
```ts
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/** Mirror of Clerk Organizations. Source of truth is Clerk; synced via webhooks. */
export const orgsTable = defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
}).index('by_clerk_org', ['clerkOrgId']);

/** Mirror of Clerk org memberships (user↔org). Projected into shopCollaborators. */
export const orgMembershipsTable = defineTable({
    clerkOrgId: v.string(),
    user: v.id('users'),
    clerkUserId: v.string(),
    role: v.string(),
    createdAt: v.number(),
})
    .index('by_clerk_org', ['clerkOrgId'])
    .index('by_user', ['user'])
    .index('by_clerk_org_user', ['clerkOrgId', 'user']);
```
Register both in `schema.ts` (`orgs: orgsTable, orgMemberships: orgMembershipsTable`).
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `git commit -am "feat(convex): add orgs + orgMemberships mirror tables."`

### Task 1.3: Add `shops.clerkOrgId`

**Files:** Modify `packages/convex/convex/tables/shops.ts`; Test `tables/shops.test.ts`

- [ ] **Step 1: Write failing test** — a shop is queryable `by_clerk_org`.
```ts
test('shops are queryable by owning clerkOrgId', async () => {
    const t = convexTest(schema);
    await t.run((ctx) => ctx.db.insert('shops', { /* minimal required fields */ name: 'S', domain: 'x.com', clerkOrgId: 'org_1', /* …commerceProvider, design per existing validator… */ } as any));
    const rows = await t.run((ctx) => ctx.db.query('shops').withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', 'org_1')).collect());
    expect(rows).toHaveLength(1);
});
```
(Fill required shop fields from the existing `writableShopValidator`.)
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — add `clerkOrgId: v.optional(v.string())` to the shop validator and `.index('by_clerk_org', ['clerkOrgId'])`. Optional during migration; the backfill (Phase 7) populates existing rows.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `git commit -am "feat(convex): add shops.clerkOrgId owner + by_clerk_org index."`

### Task 1.4: Drop `sessions` + `identities` tables

**Files:** Modify `tables/auth.ts`, `schema.ts`; grep first

- [ ] **Step 1: Verify no readers** — `git grep -nE "'sessions'|'identities'|by_token|by_provider_identity" packages apps`. Resolve every hit (delete dead code). Use `find_references` (lsp-symbols) on the table accessors. If the Auth.js adapter still references them, it's deleted in Phase 4 — sequence Phase 4 deletions first if grep shows live readers.
- [ ] **Step 2: Remove** the `sessions` and `identities` `defineTable` blocks from `tables/auth.ts` and their `schema.ts` registrations.
- [ ] **Step 3: Run convex tests** `pnpm --filter @nordcom/commerce-convex test` → PASS. Run the limit-boundary gate: `pnpm --filter @nordcom/commerce-test-convex run test src/limits` → PASS.
- [ ] **Step 4: Commit** `git commit -am "refactor(convex): drop NextAuth-era sessions + identities tables."`

---

## Phase 2 — Convex auth provider + resolution

### Task 2.1: Point `auth.config.ts` at Clerk

**Files:** Modify `packages/convex/convex/auth.config.ts`

- [ ] **Step 1: Replace** the `customJwt` RS256 provider with:
```ts
export default {
    providers: [{ domain: process.env.CLERK_FRONTEND_API_URL, applicationID: 'convex' }],
};
```
- [ ] **Step 2: Verify** `npx convex dev --once` (or the repo's convex codegen) accepts the config against the dev deployment with `CLERK_FRONTEND_API_URL` set.
- [ ] **Step 3: Commit** `git commit -am "feat(convex): validate Clerk JWTs via native provider."`

### Task 2.2: Rewrite identity resolution (subject→email fallback + backfill)

**Files:** Modify `packages/convex/convex/lib/auth.ts`; Test `lib/auth.test.ts`

- [ ] **Step 1: Write failing tests** — (a) resolves by `clerkUserId` when present; (b) falls back to `by_email` and backfills `clerkUserId`; (c) throws typed error when neither matches.
```ts
test('resolves by clerkUserId subject', async () => { /* seed user clerkUserId=user_9; identity.subject=user_9 → returns that user */ });
test('falls back to email and backfills clerkUserId', async () => { /* seed user by email, no clerkUserId; identity {subject:user_new, email} → returns user AND sets clerkUserId=user_new */ });
test('throws UNKNOWN_USER when neither matches', async () => { /* expect rejects with the typed error */ });
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** — `resolveUserFromIdentity(ctx)`: read `identity = await ctx.auth.getUserIdentity()`; throw `UNAUTHENTICATED` if null. Try `users.by_clerk_user_id` on `identity.subject`. If miss, read `identity.email` (the JWT-template claim); query `by_email`; if found and `clerkUserId` unset, `ctx.db.patch(user._id, { clerkUserId: identity.subject, updatedAt: Date.now() })`; if still none, throw `UNKNOWN_USER`. Keep using `@nordcom/commerce-errors` (existing `AuthErrorCode`). Note: backfill only runs in mutation contexts — guard with a `ctx.db.patch` capability check, or expose a separate `ensureCurrentUser` (Task 5.3) for the write; queries resolve read-only.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `git commit -am "feat(convex): resolve identity by clerkUserId with email fallback."`

### Task 2.3: `resolveShopAccess(domain)` via active-org match + projection helpers

**Files:** Modify `packages/convex/convex/lib/auth.ts`; Create `packages/convex/convex/clerk/sync.ts`; Test both

- [ ] **Step 1: Write failing test** for `resolveShopAccess` — given shop with `clerkOrgId='org_1'` and an identity whose JWT `org_id='org_1'` and a matching `orgMemberships` row → returns the shop id; mismatched `org_id` → throws `NO_SHOP_MEMBERSHIP`/new `ORG_MISMATCH`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** `resolveShopAccess(ctx, domain)`: shop ← `shopDomains`/`shops` by domain; read `identity.org_id` (Clerk active-org claim); require `shop.clerkOrgId === identity.org_id`; confirm an `orgMemberships.by_clerk_org_user` row exists (defense in depth); return `shop._id`. Add `ORG_MISMATCH` to `AuthErrorCode` + the errors package per CLAUDE.md (new class + `*ErrorKind` + `getErrorFromCode`). Keep `resolveAdminShopId` as a thin deprecated alias only if still referenced; otherwise delete and update callers.
- [ ] **Step 4: Implement projection helper** `clerk/sync.ts` — pure functions: `desiredCollaboratorsForOrg(orgMembers, orgShops) → {shop, user, permissions:['admin']}[]`, and reconcilers `applyMembershipChange` / `applyShopAddedUnderOrg` that compute the `shopCollaborators` delta. Unit-test the pure delta logic.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Commit** `git commit -am "feat(convex): authorize shops via active Clerk org + projection helpers."`

---

## Phase 3 — Clerk webhook sync (httpAction + svix)

### Task 3.1: Webhook endpoint with svix verification

**Files:** Modify `packages/convex/convex/http.ts`; Create `packages/convex/convex/clerk/webhooks.ts`; add `svix` dep to `packages/convex`

- [ ] **Step 1: Add dep** `pnpm --filter @nordcom/commerce-convex add svix`.
- [ ] **Step 2: Write failing test** — an httpAction test (convex-test `t.fetch` or unit-test the handler) that a body with a valid svix signature dispatches to the sync mutation, and an invalid signature returns 400. Mock `Webhook.verify` for the signature path.
- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Implement** `clerk/webhooks.ts` — exported `httpAction` that reads `svix-id`/`svix-timestamp`/`svix-signature` headers + raw body, verifies with `new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET)`, then `switch(evt.type)` calls internal mutations:
  - `user.created|updated` → `internal.clerk.webhooks.upsertUserFromClerk` (upsert `users` by email: set `clerkUserId`, sync `name`/`avatar`).
  - `user.deleted` → soft-handle (clear `clerkUserId`; do not cascade-delete shop data).
  - `organization.created|updated` → upsert `orgs`.
  - `organization.deleted` → remove `orgs` row + its memberships (leave shops; surface in UI).
  - `organizationMembership.created|updated|deleted` → upsert/remove `orgMemberships`, then run the `clerk/sync` projection into `shopCollaborators`.
  Register `http.route({ path: '/clerk-webhooks', method: 'POST', handler })` in `http.ts`.
- [ ] **Step 5: Run → PASS.**
- [ ] **Step 6: Register endpoint** — add the Convex `/clerk-webhooks` URL to the dev Clerk instance (dashboard/CLI), subscribe the events above, copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET` (already set in 0.2). Add to config-as-code.
- [ ] **Step 7: Commit** `git commit -am "feat(convex): sync Clerk users/orgs/memberships via svix webhook."`

### Task 3.2: Internal sync mutations + projection

**Files:** `packages/convex/convex/clerk/webhooks.ts`; Test `clerk/webhooks.test.ts`

- [ ] **Step 1: Write failing tests** — (a) membership.created fans out one `shopCollaborators` row per org shop; (b) a new shop under an org backfills collaborators for all members; (c) membership.deleted removes them; (d) user upsert links an existing email row.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** the `internalMutation`s using `clerk/sync.ts` helpers; idempotent (keyed by `by_clerk_org_user` / `by_shop_user`).
- [ ] **Step 4: Run → PASS.** Run limit-boundary gate.
- [ ] **Step 5: Commit** `git commit -am "feat(convex): project org membership into shopCollaborators."`

---

## Phase 4 — Admin app Clerk wiring + NextAuth removal

### Task 4.1: ClerkProvider + Convex-with-Clerk provider + middleware

**Files:** Create `apps/admin/src/middleware.ts`, `apps/admin/src/components/providers/clerk-convex-provider.tsx`, `apps/admin/src/lib/clerk-appearance.ts`; Modify `apps/admin/src/app/(app)/layout.tsx`, `providers.tsx`

- [ ] **Step 1: `clerk-appearance.ts`** — export `clerkAppearance` (see spec UI section): `baseTheme: dark`, `variables` (`colorPrimary:'#ed1e79'`, `colorBackground:'#000000'`, `colorText:'#fefefe'`, `borderRadius:'0.5rem'`, `fontFamily:'var(--font-primary)'`), `elements` (card transparent so it nests in `AuthShell`; primary button magenta solid; social buttons `outline`). JSDoc.
- [ ] **Step 2: `clerk-convex-provider.tsx`** (`'use client'`):
```tsx
'use client';
import { useAuth } from '@clerk/nextjs';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { ReactNode } from 'react';

if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error('Missing NEXT_PUBLIC_CONVEX_URL');
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Bridges Clerk auth into the Convex React client for the admin app.
 * @param props.children - Subtree that consumes authenticated Convex hooks.
 * @returns Provider wiring Clerk's session into Convex.
 */
export function ClerkConvexProvider({ children }: { children: ReactNode }) {
    return (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {children}
        </ConvexProviderWithClerk>
    );
}
```
- [ ] **Step 3: Wrap providers** — in `app/(app)/layout.tsx` (or `providers.tsx`) wrap the tree: `<ClerkProvider appearance={clerkAppearance}>` → existing `NordstarProvider` → `<ClerkConvexProvider>`. Remove the NextAuth `SessionProvider`.
- [ ] **Step 4: `middleware.ts`** — `export default clerkMiddleware();` + `export const config = { matcher: [...] }` (Clerk's recommended matcher, excluding static + the Convex webhook is server-side so N/A). Keep public routes: sign-in, sign-up.
- [ ] **Step 5: Verify** dev boot: `pnpm dev` (portless) → admin loads, redirects unauthenticated to sign-in.
- [ ] **Step 6: Commit** `git commit -am "feat(admin): wire ClerkProvider + Convex-with-Clerk + middleware."`

### Task 4.2: Server-side Convex token via Clerk

**Files:** Create `apps/admin/src/lib/clerk-convex-token.ts`; Modify `apps/admin/src/lib/convex-auth.ts`, `cms-ctx.ts`, `account-convex.ts`; Delete `convex-token.ts`

- [ ] **Step 1: Implement** `clerk-convex-token.ts` — `getAuthenticatedConvexClient()`: `const { getToken } = await auth(); const token = await getToken({ template: 'convex' }); const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL); if (token) client.setAuth(token); return client;` Throw `@nordcom/commerce-errors` Unauthenticated when no session. JSDoc with `@throws`.
- [ ] **Step 2: Rewire** `convex-auth.ts`/`cms-ctx.ts`/`account-convex.ts` to use it; delete `mintConvexOperatorToken` usage and `convex-token.ts`; preserve `experimental_taintUniqueValue` on any token value.
- [ ] **Step 3: Verify** `pnpm --filter @nordcom/commerce-admin typecheck` — remaining errors should now only be the deleted login/page surfaces (Phase 6).
- [ ] **Step 4: Commit** `git commit -am "feat(admin): mint Convex token from Clerk getToken(convex)."`

### Task 4.3: Delete NextAuth surfaces

**Files:** Delete the files listed in "Deleted"; grep for stragglers

- [ ] **Step 1: Delete** `auth.ts`, `utils/auth.{ts,config.ts,adapter.ts}`, `api/auth/[...nextauth]/route.ts`, `.well-known/jwks.json/route.ts`, `components/login-button.tsx`.
- [ ] **Step 2: Grep** `git grep -nE "next-auth|@auth/core|from '@/auth'|signIn\\(|signOut\\(|useSession|getServerSession"` in `apps/admin` — replace each: `signIn`→Clerk `<SignInButton>`/`redirectToSignIn`; `signOut`→Clerk `<SignOutButton>`/`signOut()`; `auth()` session reads→`await auth()` from `@clerk/nextjs/server` (`userId`, `orgId`, `sessionClaims.email`).
- [ ] **Step 3: Verify** no `next-auth` imports remain; `pnpm --filter @nordcom/commerce-admin typecheck` errors now only in UI routes (Phase 6).
- [ ] **Step 4: Commit** `git commit -am "refactor(admin): remove NextAuth + RS256 minting surfaces."`

---

## Phase 5 — Active-org reconciliation + lazy provisioning

### Task 5.1: Sync active org to the routed `/[domain]/`

**Files:** Modify `apps/admin/src/app/(app)/(dashboard)/[domain]/layout.tsx`; Create a small client `ActiveOrgSync` component

- [ ] **Step 1: Server guard** — in `[domain]/layout.tsx`: resolve shop by domain (Convex), read its `clerkOrgId`; `const { orgId } = await auth();` if `orgId !== shop.clerkOrgId`, render `<ActiveOrgSync targetOrgId={shop.clerkOrgId} />` (client) which calls `setActive({ organization })` then `router.refresh()`. Until synced, do NOT render tenant content.
- [ ] **Step 2: `ActiveOrgSync`** (`'use client'`) — `useOrganizationList()/useClerk().setActive`; on mount, if active org ≠ target, `setActive` then refresh; show a minimal themed "Switching to {shop}…" state.
- [ ] **Step 3: Verify** manually — deep-link to a shop under a non-active org switches correctly, no data from the wrong tenant flashes.
- [ ] **Step 4: Commit** `git commit -am "feat(admin): sync active Clerk org to the routed storefront."`

### Task 5.2: `ensureCurrentUser` lazy safety net

**Files:** Modify `packages/convex/convex/account/self.ts`; call site in admin first-load

- [ ] **Step 1: Write failing test** (convex) — `ensureCurrentUser` with an identity whose subject/email has no `users` row creates one; idempotent on second call.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** `ensureCurrentUser` mutation — upsert `users` from identity claims (email/name/avatar/subject), same logic as the webhook upsert; return the user. JSDoc.
- [ ] **Step 4: Call** once on authenticated admin entry (e.g. a client effect in the app shell after Convex auth is ready, or a server action in the root authed layout). Guard against loops (only when query returns "no user").
- [ ] **Step 5: Run → PASS;** verify first-sign-in works even if the webhook lags.
- [ ] **Step 6: Commit** `git commit -am "feat(convex): lazy ensureCurrentUser safety net for first sign-in."`

---

## Phase 6 — UI surfaces (frontend-design)

### Task 6.1: Sign-in / sign-up routes

**Files:** Create `app/(app)/(auth)/sign-in/[[...sign-in]]/page.tsx`, `…/sign-up/[[...sign-up]]/page.tsx`; reuse `AuthShell`

- [ ] **Step 1: Implement** — render `<SignIn appearance={clerkAppearance} />` (and `<SignUp/>`) inside `AuthShell` (keep logo, pink-halo, "Welcome back"/"Create your account" eyebrow). Configure `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in` etc. (or `signInUrl`/`signUpUrl` props), `afterSignInUrl="/"`, `afterSignUpUrl="/onboarding"`.
- [ ] **Step 2: Delete** old `auth/login` + `auth/logout` pages; update any links to the new routes.
- [ ] **Step 3: Verify** sign-in renders on-brand (dark, magenta, Montserrat, chunky border), social buttons present, email-code works.
- [ ] **Step 4: Commit** `git commit -am "feat(admin): Clerk sign-in/up themed to the admin identity."`

### Task 6.2: UserButton + OrganizationSwitcher in shell

**Files:** Modify `shell-header.tsx`, `account-menu.tsx`, `shop-switcher`

- [ ] **Step 1: Replace** the avatar `AccountMenu` with `<UserButton appearance={clerkAppearance} userProfileMode="navigation" userProfileUrl="/account" />`; keep the theme toggle as a custom `<UserButton.MenuItems>` action or alongside.
- [ ] **Step 2: Replace** the `ShopSwitcher`'s org dimension with `<OrganizationSwitcher hidePersonal appearance={clerkAppearance} afterSelectOrganizationUrl=…/>` that navigates to that org's storefront chooser; keep storefront selection app-side.
- [ ] **Step 3: Verify** switching org updates the chooser + active org.
- [ ] **Step 4: Commit** `git commit -am "feat(admin): UserButton + OrganizationSwitcher in the shell."`

### Task 6.3: Bespoke org×storefront chooser

**Files:** Create `apps/admin/src/components/org-storefront-chooser.tsx`; Modify `app/(app)/page.tsx`

- [ ] **Step 1: Implement** — server component fetches, for the current user, all orgs (via `orgMemberships` mirror) joined to `shops.by_clerk_org`, grouped by org. Render the ASCII-wireframe layout (spec): org section headers + Nordstar shop cards (`border-3 rounded-xl`, hover lift, staggered fade-in), `+ New storefront` per org, `+ Create organization` footer. Empty state: "No storefronts yet — create your first one." Cards link to `/[domain]/` and trigger active-org sync.
- [ ] **Step 2: Verify** multi-org mix-mash renders correctly; single-org user sees one group.
- [ ] **Step 3: Commit** `git commit -am "feat(admin): grouped org x storefront chooser."`

### Task 6.4: Create-org onboarding + storefront-under-org

**Files:** Create `app/(app)/(setup)/onboarding/page.tsx`; Modify `app/(app)/(setup)/new/actions.ts`

- [ ] **Step 1: Onboarding** — render `<CreateOrganization afterCreateOrganizationUrl="/new" appearance={clerkAppearance} />`. New users (no membership) route here (`afterSignUpUrl`).
- [ ] **Step 2: Wizard writes org** — `createShop` action sets the new shop's `clerkOrgId` to the active org (`auth().orgId`); shop insert backfills collaborators for current org members (Phase 3 projection covers webhook-driven; the wizard path can call the projection mutation directly for immediacy).
- [ ] **Step 3: Verify** end-to-end: sign-up → create org → create storefront → land in `/[domain]/` as admin.
- [ ] **Step 4: Commit** `git commit -am "feat(admin): self-serve org + storefront onboarding."`

### Task 6.5: Landing sign-in link

**Files:** Modify `apps/landing/**` (header/CTA)

- [ ] **Step 1: Add** a "Sign in" link → `${ADMIN_URL}/auth/sign-in` (use the existing admin-URL helper). No ClerkProvider on landing.
- [ ] **Step 2: Commit** `git commit -am "feat(landing): add admin sign-in link."`

---

## Phase 7 — Existing-operator org backfill (one-time migration)

### Task 7.1: Backfill a Clerk org per existing shop membership

**Files:** Create `packages/convex/convex/clerk/backfill.ts` (internal action) + a runbook note in spec

- [ ] **Step 1: Write failing test** for the planning query — `pendingOrgBackfill()` returns shops with no `clerkOrgId` and their current `shopCollaborators`.
- [ ] **Step 2: Run → FAIL → Implement** the query.
- [ ] **Step 3: Implement** an internal action that, for each shop without `clerkOrgId`: creates a Clerk Organization (Backend API) named for the shop, invites/adds its collaborators as members, then sets `shops.clerkOrgId` and upserts the `orgs`/`orgMemberships` mirrors. Idempotent — skip shops that already have `clerkOrgId`.
- [ ] **Step 4: Dry-run** against dev with seeded data; verify idempotency on re-run.
- [ ] **Step 5: Commit** `git commit -am "feat(convex): one-time Clerk org backfill for existing shops."`

---

## Phase 8 — E2E harness (`@clerk/testing`) + specs

### Task 8.1: Rewrite global setup

**Files:** Modify `apps/admin/e2e/global-setup.ts`; Create `apps/admin/e2e/support/clerk.ts`

- [ ] **Step 1: Implement** global setup: `await clerkSetup()`; ensure Clerk test user `e2e-test+clerk_test@example.com` + its Clerk org + membership via Backend API (`CLERK_SECRET_KEY`); seed Convex `users`(clerkUserId)+`orgs`+`orgMemberships`+projected `shopCollaborators` for the canonical shop (extend `seedCanonical`/`@nordcom/commerce-test-convex`); `await clerk.signIn({ page, emailAddress })`; save storage state. Remove all NextAuth JWT cookie signing.
- [ ] **Step 2: Per-spec helper** — `setupClerkTestingToken({ page })` wrapper in `support/clerk.ts`.
- [ ] **Step 3: Verify** `pnpm test:e2e --filter @nordcom/commerce-admin` reaches the dashboard authenticated (dev instance keys present).
- [ ] **Step 4: Commit** `git commit -am "test(admin): authenticate e2e via @clerk/testing."`

### Task 8.2: Specs for new flows

**Files:** Create `apps/admin/e2e/*.spec.ts`

- [ ] **Step 1: Write** specs (real app, rerun-safe with a unique run token): `sign-in.spec.ts`, `onboarding-create-org.spec.ts`, `org-switch.spec.ts` (asserts active-org sync + no wrong-tenant flash), `storefront-chooser.spec.ts`, `no-access-empty.spec.ts`. Use REAL seeded handles per CLAUDE.md.
- [ ] **Step 2: Run → green;** stamp/restore any mutated state.
- [ ] **Step 3: Commit** `git commit -am "test(admin): e2e for Clerk sign-in, onboarding, org switch."`

---

## Phase 9 — Env vars (CI + Vercel + Convex), prod config, finalize

### Task 9.1: `.env.example` + env helpers

**Files:** Modify `.env.example`

- [ ] **Step 1: Remove** (from `.env.example` ONLY) the legacy block: `NEXTAUTH_SECRET`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `GITHUB_ID`, `GITHUB_TOKEN`, `CONVEX_AUTH_ISSUER`, `CONVEX_AUTH_APPLICATION_ID`, `CONVEX_AUTH_JWKS_URL`, `CONVEX_AUTH_PRIVATE_KEY`. **Do NOT** touch CI/Vercel/`.env.local` values (kept for safekeeping per decision 16).
- [ ] **Step 2: Add** the Clerk vars (spec table) with comments noting dev-vs-prod and which are Convex-deployment vs app vars.
- [ ] **Step 3: Commit** `git commit -am "docs(env): swap NextAuth vars for Clerk in .env.example."`

### Task 9.2: CI workflow — Clerk env + e2e keys

**Files:** Modify `.github/workflows/ci.yml`

- [ ] **Step 1: Add** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (dev instance, from `secrets.*`) to the build + e2e jobs; set `CLERK_FRONTEND_API_URL` + `CLERK_WEBHOOK_SIGNING_SECRET` on the ephemeral Convex backend used by integration/e2e. Leave existing legacy `AUTH_SECRET` lines in place (harmless, kept). Add the GitHub repo secrets via `gh secret set` (document values are dev-instance).
- [ ] **Step 2: Verify** CI e2e job authenticates. Run the limit-boundary gate in CI path.
- [ ] **Step 3: Commit** `git commit -am "ci: provide Clerk dev keys to build + e2e."`

### Task 9.3: Deploy workflow — prod Clerk config + Convex env

**Files:** Modify `.github/workflows/deploy.yml`

- [ ] **Step 1: Add** a prod-config step (mirrors the Convex deploy job): apply committed `clerk/clerk.config.json` to the **prod** instance non-interactively via the mechanism confirmed in P0b (Backend API / `clerk api` with `secrets.CLERK_SECRET_KEY_PROD`), and `npx convex env set CLERK_FRONTEND_API_URL/CLERK_WEBHOOK_SIGNING_SECRET` on the prod Convex deployment. Register/refresh the prod webhook endpoint.
- [ ] **Step 2: Add** Vercel env push (where scriptable) via `vercel env` for the admin project's Production + Preview scopes; otherwise document the one-time Vercel dashboard step in the runbook.
- [ ] **Step 3: Commit** `git commit -am "ci: apply prod Clerk config + Convex env on deploy."`

### Task 9.4: Changeset + full verification + finish

**Files:** Create `.changeset/clerk-auth-migration.md`

- [ ] **Step 1: Changeset** — `pnpm changeset`; pick `minor` for `@nordcom/commerce-admin` + `@nordcom/commerce-convex` (additive auth surface; document the breaking ops note: requires Clerk env + one-time prod bootstrap). WHY-only summary.
- [ ] **Step 2: Full gate** (fresh worktree order):
```bash
pnpm build:packages
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @nordcom/commerce-test-convex run test src/limits
pnpm test:e2e --filter @nordcom/commerce-admin
```
All green. Fix forward (root-cause; no reverting features).
- [ ] **Step 3: Use** superpowers:verification-before-completion to confirm evidence before claiming done; then superpowers:finishing-a-development-branch to rebase onto `master` and open the PR.
- [ ] **Step 4: Commit** `git commit -am "chore: changeset for Clerk auth migration."`

---

## Self-review (author checklist — run after writing)

1. **Spec coverage:** every decision-log row maps to a task — scope→4/6.5, Convex seam→2.1, identity key→2.2, sign-in methods→0.2, Shopify→0.2 (placeholder), access/onboarding→6.4, provisioning→3+5.2, e2e→8, tenancy→1/2/3, collaborators mirror→3.2, org model→1.2/1.3, active-org→5.1, roles→2.3 (`['admin']`), CLI provisioning→0.2/9.3, env mapping→9, legacy vars→9.1, cleanup→1.4/4.3, cutover→worktree/Phase ordering, UI→6. ✔
2. **Open items tracked:** CLI CI-auth (P0b/9.3), SSR staleness (5.1 + org-switch e2e 8.2), backfill idempotency (7.1), webhook consistency (5.2), schema-drop readers (1.4 grep). ✔
3. **Type consistency:** `clerkUserId`, `clerkOrgId`, `orgMemberships`, `resolveShopAccess`, `ensureCurrentUser`, `clerkAppearance`, `ClerkConvexProvider`, `getAuthenticatedConvexClient` used consistently across tasks. ✔

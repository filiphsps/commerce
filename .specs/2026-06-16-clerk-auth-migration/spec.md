# Clerk Auth Migration — Spec

**Status:** Approved for planning (grilled 2026-06-16)
**Branch:** `feat/clerk-auth-migration` (isolated worktree at execution)
**Scope owner app:** `apps/admin` (landing gets a sign-in link only)

## Goal

Replace the admin app's hand-rolled NextAuth v5 + custom RS256 → Convex `customJwt`
auth with Clerk, using Clerk Organizations as the multi-tenant model, while preserving
the existing `/[domain]/` per-shop routing and Convex authorization seam.

## Background — current state (mapped 2026-06-16)

- **Auth:** `next-auth@5.0.0-beta.31` + `@auth/core` in `apps/admin`, JWT session
  strategy, **GitHub OAuth only**. Configs: `apps/admin/src/utils/auth.{ts,config.ts,adapter.ts}`,
  route `apps/admin/src/app/api/auth/[...nextauth]/route.ts`, re-export `apps/admin/src/auth.ts`.
- **Convex bridge:** admin mints a custom **RS256 JWT** (`apps/admin/src/lib/convex-token.ts`,
  claims `email` + `activeShop`) served via `apps/admin/src/app/.well-known/jwks.json/route.ts`;
  Convex validates it as a `customJwt` provider in `packages/convex/convex/auth.config.ts`.
- **Identity resolution:** `packages/convex/convex/lib/auth.ts` — `resolveUserFromIdentity`
  (email → `users.by_email`), `resolveAdminShopId` (user → `shopCollaborators.by_user`,
  errors on 0 / >1 membership: `NO_SHOP_MEMBERSHIP` / `AMBIGUOUS_SHOP_MEMBERSHIP`).
- **Tables:** `packages/convex/convex/tables/auth.ts` — `users` (email-keyed, embedded
  `identities[]`), `sessions` (unused under JWT strategy), `identities`.
- **Tenancy:** `shops`, `shopCollaborators { shop, user, permissions[] }`. The
  Auth.js adapter's `createUser` → `db/users:create` is the **only** path that provisions
  a `users` row today. Shop creation wizard (`apps/admin/src/app/(app)/(setup)/new/`)
  auto-makes the creator an `['admin']` collaborator via `db/shop_write:upsertShop`.
- **E2E:** `apps/admin/e2e/global-setup.ts` signs a NextAuth JWT cookie offline
  (`__Secure-authjs.session-token`) using `NEXTAUTH_SECRET`.
- **Design:** Nordstar design system (`@nordcom/nordstar`), dark-mode only, primary
  `#ED1E79`, Montserrat (`--font-primary`) + Geist Mono, `border-3` chunky cards,
  `--radius: 0.5rem`, pink-halo glow shell (`apps/admin/src/components/auth-shell.tsx`).

## Decision log (resolved during grilling)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Landing scope | **Admin-only Clerk.** Landing stays static, gets a "Sign in" link → admin sign-in route. No ClerkProvider on landing. |
| 2 | Convex seam | **Replace** the RS256 minting seam with Clerk's native Convex integration. |
| 3 | Identity key | `clerkUserId` (Clerk `subject`) **primary**, `email` **fallback** with lazy backfill. JWT template carries both. |
| 4 | Sign-in methods | GitHub OAuth, Email magic-link/OTP, Google OAuth, **Shopify OAuth (scaffold/placeholder only)**. Accounts may link multiple methods (Clerk account linking). |
| 5 | Shopify scope | **Env + config placeholders only** this plan; no working button, no e2e. |
| 6 | Access gating | **Open sign-up + self-serve onboarding** (new user → create org → create storefront). |
| 7 | User provisioning | **Clerk webhook → Convex httpAction (svix)** is source of truth; **lazy `ensureCurrentUser`** mutation as first-load safety net. |
| 8 | E2E auth | `@clerk/testing` + **email-OTP test mode** (`clerk.signIn`) against the Clerk **dev** instance. |
| 9 | Tenancy model | **Adopt Clerk Organizations.** Org = team/account; **owns N storefronts (shops)**. User ∈ multiple orgs. |
| 10 | Collaborators | Keep `shopCollaborators` as a **webhook-synced read-mirror** (fan-out projection); existing Convex queries unchanged. |
| 11 | Org data model | Add `orgs` mirror + org-membership mirror + `shops.clerkOrgId`; **fan out** org membership → `shopCollaborators` for every shop the org owns. |
| 12 | Active org ↔ routing | **URL (`/[domain]/`) is canonical.** On entering a shop route, resolve its `clerkOrgId` and `setActive` to match; server verifies token `org_id` == shop's owning org, redirects through a sync step if stale. |
| 13 | Roles | Baseline: **every org member → `['admin']`** permission (parity). Clerk role granularity deferred. |
| 14 | Provisioning | Agent provisions **DEV** via Clerk CLI + commits config-as-code; **PROD** config applied in **GitHub CI** via Clerk Backend API (`CLERK_SECRET_KEY` secret). One-time human prod bootstrap (DNS, real OAuth apps). |
| 15 | Env mapping | Clerk **dev** instance → Vercel Preview + local dev + CI/e2e. Clerk **prod** instance → Vercel Production. Set via CLI/scripts in CI where possible. |
| 16 | Legacy env vars | Removed from **`.env.example` only**. **Kept** in CI, Vercel, and local `.env.local` for safekeeping. |
| 17 | Cleanup | **Full removal now:** NextAuth + RS256 + JWKS + Convex `sessions`/`identities` tables + `users.identities[]`. |
| 18 | Cutover | **Big-bang on a feature branch** (isolated worktree). No dual-auth, no flag. |
| 19 | UI approach | **Clerk prebuilt components themed via `appearance`** to match admin tokens; bespoke org×storefront chooser only. |

## Correction (2026-06-16, Task 2.1) — the Convex `customJwt` provider is SHARED with storefront customers

Discovered during implementation: the Convex `customJwt` RS256 provider is **not admin-only**.
Storefront **customers** mint RS256 tokens via `apps/storefront/src/utils/convex-token.ts`
(same `CONVEX_AUTH_PRIVATE_KEY`/`CONVEX_AUTH_ISSUER`/`CONVEX_AUTH_APPLICATION_ID`), served by
`apps/storefront/src/app/[domain]/api/auth/convex-jwks/route.ts`, and validated by the **same**
`auth.config.ts` provider feeding `lib/authed.ts` (`authedQuery`/`authedMutation`) for
`account/profile` + `account/self`. This **supersedes decisions #2 and #17** as follows:

- **Decision #2 (revised):** Convex gets the Clerk provider **ADDED ALONGSIDE** the customJwt
  provider (both in `auth.config.ts.providers`). Only the **admin operator** minting moves to
  Clerk. The customer customJwt provider stays until a future, separate storefront migration.
- **Decision #17 (revised cleanup scope):** Delete only the **admin** RS256 surfaces
  (`apps/admin/src/lib/convex-token.ts`, `apps/admin/src/app/.well-known/jwks.json/route.ts`).
  **KEEP** the storefront's `apps/storefront/src/utils/convex-token.ts`, its
  `…/api/auth/convex-jwks/route.ts` + `…/api/auth/convex-token/route.ts`, and the shared
  `CONVEX_AUTH_*` keypair. **Do NOT** drop these on the Convex deployment.
- **Issuer split (reshapes Task 2.2):** `lib/auth.ts` `getTrustedIdentity` re-asserts
  `iss == CONVEX_AUTH_ISSUER` — that is the **customer-tier** gate and MUST stay for storefront.
  Admin/operator code must validate the **Clerk** issuer/claims on its **own** path (a new
  admin-specific identity getter, e.g. `getClerkOperatorIdentity`), NOT by reusing
  `getTrustedIdentity`. The two issuers are disjoint, so the providers never cross-validate.
- **Env (revised #16):** `CONVEX_AUTH_*` remain set on the Convex **deployment** (dev + prod)
  because storefront needs them; they are only removed from `.env.example`. New Clerk vars are
  added on top.
- **Task 1.4 (revised):** drop only the NextAuth-era `sessions`/`identities` tables +
  `users.identities[]`. The customer customJwt provider and storefront minting are NOT touched.
- **Convex authz is mirror-based, not org_id-claim-based (reshapes Task 2.3 & decision #12):**
  Clerk's custom `convex` JWT template does not auto-carry active-org claims, and Convex
  surfacing arbitrary custom claims on `getUserIdentity()` is uncertain. So the Convex
  authorization gate is **membership in the shop's owning org via the synced mirror**:
  `resolveShopAccess(ctx, domain)` = operator (`subject`→`users`) ∈
  `orgMemberships.by_clerk_org_user(shop.clerkOrgId, user)`. Uses only the standard `subject`
  claim + the mirror — no dependency on `org_id` being surfaced. The active-org / `org_id`
  concern (decision #12) is an **app-layer** matter (Task 5.1: keep Clerk's active org synced to
  the routed `/[domain]/` for UI/`OrganizationSwitcher` consistency). The `convex` JWT template
  still declares `org_id`/`org_role`/`org_slug` (`{{org.id}}` etc.) for the app layer + future
  defense-in-depth, but Convex authorization does not require them.

## Target architecture

### Clerk instances & environments

- **Dev instance:** uses Clerk's shared dev OAuth (no GitHub/Google app needed). Backs
  Vercel **Preview**, local dev, and **CI/e2e** (test-mode reserved emails are dev-only).
- **Prod instance:** own GitHub/Google OAuth apps + DNS CNAMEs. Backs Vercel **Production**.
- Config-as-code (`clerk config pull` output) committed to the repo; the convex JWT
  template, social connections, organizations setting, and Shopify custom-OAuth placeholder
  are all declared there and applied to both instances.

### Identity & user provisioning

- Clerk identity `subject` = Clerk user id. The **`convex` JWT template** adds
  `email: {{user.primary_email_address}}` (and Clerk's native `org_id`/`org_role`/`org_slug`
  active-org claims ride along automatically).
- `users` table gains `clerkUserId?: string` with index `by_clerk_user_id`.
- **Webhook (source of truth):** Clerk `user.created` / `user.updated` / `user.deleted`
  hit a Convex httpAction. Handler upserts `users` **by email** — if a row exists, set
  `clerkUserId` = subject and sync `name`/`avatar`; else insert a new row with `clerkUserId`.
  This single upsert covers both brand-new operators and existing email-keyed rows.
- **Lazy safety net:** `account/self:ensureCurrentUser` mutation, called on first
  authenticated admin load, performs the same upsert from JWT claims if the webhook
  hasn't landed yet (first-sign-in race). Idempotent with the webhook.
- `resolveUserFromIdentity` resolves `by_clerk_user_id` on `identity.subject` first;
  falls back to `by_email`, lazily backfilling `clerkUserId` on that path.

### Organizations as the tenant model

```
Clerk Organization (team/account)
        │  owns
        ▼
   shops (storefronts)   ← shops.clerkOrgId  (index by_clerk_org)
        │
   /[domain]/…  route = one shop, owned by one org

User ∈ many orgs (Clerk org memberships) → sees a mix-mash of storefronts across orgs
```

- **Convex mirror tables** (synced from Clerk webhooks, read-only mirrors):
  - `orgs { clerkOrgId, name, slug, imageUrl?, createdAt, updatedAt }` — index `by_clerk_org`.
  - `orgMemberships { clerkOrgId, user: Id<'users'>, clerkUserId, role, createdAt }` —
    indexes `by_clerk_org`, `by_user`, `by_clerk_org_user`.
- **Projection:** a membership change fans out to `shopCollaborators` — one row per shop
  the org owns, `permissions: ['admin']` (decision 13). Adding a shop under an org backfills
  collaborator rows for all current org members. This keeps every existing
  `shopCollaborators`-based query unchanged (they read a derived projection).
- **Webhook events synced:** `organization.created/updated/deleted`,
  `organizationMembership.created/updated/deleted` (plus the `user.*` events above).

### Active org ↔ `/[domain]/` reconciliation

- The `/[domain]/` segment stays the tenant selector. On entering a shop route:
  1. Resolve the shop → `shop.clerkOrgId` (the owning org).
  2. Client `setActive({ organization: clerkOrgId })` if the active org differs.
  3. Server layout reads `auth().orgId`; if it ≠ the routed shop's owning org (stale first
     paint after a switch), redirect through a short sync step rather than render with the
     wrong tenant.
- **Convex authorization** (`resolveShopAccess(domain)`, replacing `resolveAdminShopId`):
  shop → `clerkOrgId`; require the verified JWT `org_id` == that `clerkOrgId` (Clerk only
  emits `org_id` for orgs the user is an active member of), and confirm the
  `orgMemberships`/`shopCollaborators` mirror agrees (defense in depth).
- The shop chooser lists storefronts across **all** the user's orgs (via the
  `orgMemberships` mirror joined to `shops.by_clerk_org`), grouped by org.

### Convex integration

- `packages/convex/convex/auth.config.ts` → `{ providers: [{ domain: process.env.CLERK_FRONTEND_API_URL, applicationID: 'convex' }] }`.
- **Client:** `apps/admin` wraps the tree in `<ClerkProvider>` → `<ConvexProviderWithClerk client={convex} useAuth={useAuth}>` (`convex/react-clerk`, `useAuth` from `@clerk/nextjs`).
- **Server:** replace `mintConvexOperatorToken` with `(await auth()).getToken({ template: 'convex' })` → `convexHttpClient.setAuth(token)`. `apps/admin/src/lib/convex-auth.ts` is reworked (not deleted) to wire Clerk's token; `convex-token.ts` + the JWKS route are deleted.

### Sign-in methods & account linking

- Enabled on both instances: GitHub OAuth, Google OAuth, Email code (magic-link/OTP).
- **Account linking:** Clerk "link accounts with same verified email" on → one Clerk user
  may hold GitHub + Google + email. Subject-primary resolution (decision 3) is stable across
  methods. Existing operators' first Clerk sign-in links to their email-keyed `users` row.
- **Shopify OAuth:** reserved env vars + a documented Clerk custom-OAuth-connection in the
  config-as-code, marked TODO; no UI, no e2e (decision 5).

### Onboarding (self-serve)

- New user (no org) lands on a **create-organization** step (`<CreateOrganization />`),
  then the existing **create-storefront** wizard (`/[domain]/…` after creation), which now
  creates a shop **under the active org** (writes `shops.clerkOrgId`). Org membership +
  webhook projection grant `['admin']` on the new storefront.
- Existing single-shop operators: on first sign-in, a one-time migration backfills a Clerk
  org for their current shop membership (see plan Phase 7) so they land in their org.

### Access & roles

- Authorization gate = active-org match + mirror agreement. Every org member is `['admin']`
  for parity; Clerk roles (`org:admin`/`org:member`) are stored in the mirror for future
  granularity but not yet enforced.

## UI / design direction (frontend-design)

Reskin Clerk's prebuilt components to the **existing** admin identity — do not invent a new look.

- **`appearance.variables`:** `colorPrimary: #ED1E79`, `colorBackground: #000`,
  `colorText: #fefefe`, `colorInputBackground` ~ card, `borderRadius: 0.5rem`,
  `fontFamily: var(--font-primary)` (Montserrat). `baseTheme: dark`.
- **`appearance.elements`:** card → `border-3` + `bg-card/40 backdrop-blur-sm` (or
  `card: 'shadow-none bg-transparent'` so Clerk's card sits inside the existing `AuthShell`);
  primary button → Nordstar solid-primary look; social buttons → `outline` `h-12`.
- **Surfaces:**
  - `<SignIn/>` / `<SignUp/>` nested inside `AuthShell` (keep logo, pink-halo, "Welcome back" eyebrow).
  - `<UserButton/>` replaces `AccountMenu`'s avatar dropdown in `shell-header`.
  - `<UserProfile/>` (themed) replaces the custom `accounts/` page (theme preference stays
    a Convex-backed control alongside it).
  - **Bespoke org×storefront chooser** (replaces `apps/admin/src/app/(app)/page.tsx`): the
    `<OrganizationSwitcher/>` for org selection + a Nordstar grid reusing the existing
    shop-card pattern (`border-3 rounded-xl`, hover lift, staggered fade-in), grouped by org:

```
┌──────────────────────────────────────────────┐
│  [logo]                         [UserButton]   │
│  Hi {firstName}                                │
│  Choose a storefront                           │
│                                                │
│  ▸ ACME ORG                  [+ New storefront]│
│    ┌───────────┐  ┌───────────┐                │
│    │ S  shop-a │  │ S  shop-b │   …            │
│    └───────────┘  └───────────┘                │
│  ▸ OTHER ORG                 [+ New storefront]│
│    ┌───────────┐                               │
│    │ S  shop-c │                               │
│    └───────────┘                               │
│                                                │
│  [ + Create organization ]                     │
└──────────────────────────────────────────────┘
```

- Copy: action-named, sentence case ("Create storefront", "Create organization", empty
  state "No storefronts yet — create your first one"). American English.

## Environment variables

### New (added to `.env.example`, `.env.local`, CI, Vercel, Convex as noted)

| Var | Where | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | admin (Vercel Preview/Prod), CI, `.env.local` | dev key for Preview/CI, prod key for Production |
| `CLERK_SECRET_KEY` | admin (Vercel Preview/Prod), CI, `.env.local` | dev/prod per env; CI prod-config job uses prod key |
| `CLERK_FRONTEND_API_URL` | **Convex deployment** (dev + prod) + admin | `auth.config.ts` domain |
| `CLERK_WEBHOOK_SIGNING_SECRET` | **Convex deployment** (dev + prod) | svix verification in httpAction |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` `…SIGN_UP_URL` `…AFTER_SIGN_IN_URL` `…AFTER_SIGN_UP_URL` | admin | route config (may live in code) |
| `SHOPIFY_OAUTH_CLIENT_ID` / `SHOPIFY_OAUTH_CLIENT_SECRET` | reserved placeholders | scaffold only |

Convex deployment vars set via `npx convex env set …` (dev locally; prod in CI deploy job).

### Removed from `.env.example` only (kept in CI, Vercel, `.env.local`)

`NEXTAUTH_SECRET`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `GITHUB_ID`, `GITHUB_TOKEN`,
`CONVEX_AUTH_ISSUER`, `CONVEX_AUTH_APPLICATION_ID`, `CONVEX_AUTH_JWKS_URL`,
`CONVEX_AUTH_PRIVATE_KEY`.

## Clerk CLI provisioning

- **Dev (agent, during execution):** `clerk apps create` (or link), then apply config-as-code
  — convex JWT template, GitHub/Google/email connections, Organizations enabled + "allow
  multiple orgs", account linking, Shopify custom-OAuth placeholder. Commit `clerk config pull` output.
- **Prod (GitHub CI on deploy):** apply the **same committed config** non-interactively via
  the Clerk **Backend API** (`clerk api …` or direct REST) authenticated with the prod
  `CLERK_SECRET_KEY` GitHub secret — mirrors the Convex prod-deploy job. Webhook endpoint
  (Convex `/clerk-webhooks` URL) registered to the prod instance.
- **One-time human prod bootstrap:** `clerk deploy` for DNS CNAMEs + create real GitHub/Google
  OAuth apps. Documented as a runbook in the plan.

> **Resolved (P0b, 2026-06-16):** `clerk auth login` is **browser-OAuth only** — no
> first-class CI login token. CLI surface: `init/link/apps/env/config/enable/disable/api/deploy/whoami`.
> **CI prod-config path = `clerk api` (or direct Clerk Backend REST) authenticated with the
> prod `CLERK_SECRET_KEY`** GitHub secret — non-interactive, no browser. Human runs
> `clerk auth login` + `clerk deploy` once for the prod bootstrap. **Use `pnpm dlx clerk@latest`,
> never `npx`** (repo hook blocks npx).

### Provisioned dev instance (Task 0.2, 2026-06-16)

Linked the project to the **existing** Clerk app **"Nordcom Commerce"** (user's choice):
- App `app_3EWttZ6FZ31gkQKF9tgLLx1MreW`, dev instance `ins_3EWttZbcWibFmatzmoKc53agbqw` (no prod instance yet).
- **Frontend API:** `https://internal-roughy-49.clerk.accounts.dev` (= `CLERK_FRONTEND_API_URL`).
- **Already configured on the instance:** Organizations enabled (creator `org:admin`, org-creation on,
  `force_organization_selection: true`); GitHub + Google enabled with empty client creds (Clerk shared
  dev OAuth); email `email_code`/`email_link` sign-in. Multiple-orgs-per-user is Clerk default.
- **Applied:** created the `convex` JWT template (`jtmp_3FCxnLNsVOKgodBPItEk1vfk4l9`, RS256, Clerk default
  keys → JWKS-discoverable, claims `aud: "convex"` + `email` + `org_id`/`org_role`/`org_slug`). The
  **`aud: "convex"` claim is REQUIRED** — Convex's `domain` provider matches a token on BOTH `iss`
  (== `CLERK_FRONTEND_API_URL`) AND `aud` (== `applicationID: 'convex'`); without it Convex rejects the
  operator token with `NoAuthProvider: No auth provider found matching the given token` (caught during
  the e2e run). Template-as-code committed to `clerk/convex-jwt-template.json` (applied via
  `clerk api -X PATCH /jwt_templates/<id>`); prod must apply the same. Also patched
  `auth_access_control.block_email_subaddresses → false` so e2e `+clerk_test` emails work (dev-only;
  prod keeps it true). Account-linking by verified email is Clerk's default — no change needed.
- **Config-as-code:** committed to `clerk/clerk.config.json` (secret-free; client secrets are empty
  strings). Dev keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL`)
  written to gitignored root `.env.local`.
- **Deferred (no public Convex URL yet — local backend only):** registering the Clerk **webhook
  endpoint** (`<convex-site>/clerk-webhooks`, events `user.*`/`organization.*`/`organizationMembership.*`)
  and setting `CLERK_FRONTEND_API_URL` + `CLERK_WEBHOOK_SIGNING_SECRET` on the Convex **deployment**.
  These happen when a deployed Convex URL exists (e2e/CI/prod). The Convex auth provider only needs
  `CLERK_FRONTEND_API_URL` set on whatever deployment serves a given env.

### Existing-shop org backfill (Task 7.1) — runbook

A one-time migration gives every EXISTING shop a Clerk Organization + links its collaborators, so
multi-shop operators aren't locked out once `resolveShopAccess` requires org membership. Lives in
`packages/convex/convex/clerk/backfill.ts` (planning query `pendingOrgBackfill`, idempotent mirror
mutations `applyShopOrgBackfill`/`stampShopClerkOrg`, the `internalAction` `run`) + the Clerk Backend
client `clerk/backend_client.ts`. **NOT client-callable** (internal-only).

- **Lockout-safe rule (why the backfill defers some shops):** `resolveShopAccess` HARD-FAILS for a
  shop — `SHOP_WITHOUT_ORG` when `clerkOrgId` is unset, `NO_ORG_MEMBERSHIP` when set but the operator
  has no `orgMemberships` row — there is **no legacy `shopCollaborators` fallback**. So stamping
  `shops.clerkOrgId` is only safe once EVERY collaborator who can be a member already is one. A
  collaborator with **no Clerk account yet** cannot be an `orgMemberships` row (the mirror needs a
  Clerk subject), so the backfill **does NOT stamp `clerkOrgId` on a shop that still has un-provisioned
  collaborators** — it creates the org, adds the linked members, **invites** the rest by email, and
  leaves the shop un-stamped (its current, access-equivalent pre-Clerk state — so the backfill never
  regresses access). Re-run after the invited users accept to complete (stamp) those shops. Shops with
  no linked operator at all are reported deferred with no org created (Clerk's create-org needs a
  `created_by`); link/invite an operator and re-run.
- **Idempotency:** keyed two ways so a re-run never duplicates. (1) A fully-completed shop carries
  `shops.clerkOrgId` and is skipped by `pendingOrgBackfill`. (2) For a shop whose org was created on a
  prior deferred pass but not stamped, the org **slug is deterministic from the domain**
  (`orgSlugFromDomain`), so `findOrCreateOrg` probes `GET /organizations/{slug}` and **reuses** the
  existing org. The `orgs`/`orgMemberships` mirror upserts and the `shopCollaborators` projection are
  themselves idempotent (patch-in-place + reconcile-to-desired). The Clerk Backend calls tolerate
  `already_a_member_in_organization` (membership) and `duplicate_record` (invitation) as no-ops.
- **Prereqs:** the Convex deployment env has `CLERK_SECRET_KEY` set (dev or prod Clerk instance — the
  action reads it via `getServerEnv`). Run `convex codegen` first so `_generated/` matches the live
  schema (the `clerk/backfill` internal entries are hand-synced in this worktree; see risk #8).
- **Invocation** (from `packages/convex`, against the target deployment):
  `pnpm --filter @nordcom/commerce-convex convex:backfill clerk/backfill:run`
  (the `convex:backfill` script is `convex run`; this resolves to `convex run clerk/backfill:run`).
  The action returns `{ processed, backfilled, deferred, outcomes[] }` — per-shop `{ orgCreated,
  membersAdded, invitationsSent, deferred }`. Re-run until `deferred` is 0 (after invited users accept).

## E2E harness

- Add `@clerk/testing`. `global-setup.ts`: `clerkSetup()` (Testing Token via `CLERK_SECRET_KEY`),
  ensure a Clerk **test user** (`e2e-test+clerk_test@example.com`) via Backend API, ensure its
  Clerk **org** + membership, then seed the matching Convex `users` (`clerkUserId`) + `orgs` +
  `orgMemberships` + projected `shopCollaborators` for the canonical shop. Sign in via
  `clerk.signIn({ page, emailAddress })` (server-side token, bypasses verification); save
  storage state. Per-spec, `setupClerkTestingToken({ page })`.
- Runs against the Clerk **dev** instance only. CI needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  + `CLERK_SECRET_KEY` (dev) in the e2e job.
- New flows get specs (CLAUDE.md E2E rule): sign-in, create-org onboarding, org-switch,
  storefront chooser, no-access/empty states.

## Cleanup — removed in this migration

- **Files (delete):** `apps/admin/src/utils/auth.{ts,config.ts,adapter.ts}`,
  `apps/admin/src/auth.ts`, `apps/admin/src/app/api/auth/[...nextauth]/route.ts`,
  `apps/admin/src/app/.well-known/jwks.json/route.ts`, `apps/admin/src/lib/convex-token.ts`,
  `apps/admin/src/components/login-button.tsx`,
  `apps/admin/src/app/(app)/(auth)/auth/login/page.tsx` + `…/logout/page.tsx`.
- **Convex schema:** drop `sessions` + `identities` tables and the embedded `users.identities[]`;
  rewrite `auth.config.ts` and `lib/auth.ts`. Touches the limit-boundary CI gate
  (`pnpm --filter @nordcom/commerce-test-convex run test src/limits`).
- **Deps:** remove `next-auth`, `@auth/core` from `apps/admin`; add `@clerk/nextjs`,
  `@clerk/testing`, `convex` `react-clerk` is part of `convex`. Add changeset(s).

## Out of scope / deferred

- Full Shopify OAuth sign-in (placeholders only).
- Clerk role granularity / per-shop permissions (mirror stores roles; not enforced).
- Landing app session awareness (link only).
- Org-level billing/settings UI (orgs table reserved for it later).

## Risks & open items

1. **CLI CI-auth mechanism** — verify exact command (see Open item above).
2. **Active-org SSR staleness** — first paint after an org switch may lag the token; the
   server sync-redirect (decision 12) must cover it. Validate with an org-switch e2e.
3. **Existing-operator org backfill** — IMPLEMENTED (Task 7.1, `clerk/backfill.ts`). One-time migration
   creates a Clerk org per shop without duplicating on re-run (idempotent by `shops.clerkOrgId` for
   completed shops + a deterministic domain-derived org slug for find-or-create on partial re-runs).
   Lockout-safe: a shop with un-provisioned collaborators is NOT stamped (the rest are invited; re-run
   to complete). See the "Existing-shop org backfill — runbook" section above.
4. **Webhook eventual consistency** — membership/shop changes have a sync window; the lazy
   `ensureCurrentUser` and server-side mirror checks must tolerate it.
5. **Convex schema drop** — `sessions`/`identities` removal is a migration; confirm no
   residual readers before deleting (grep + LSP find_references).
7. **Migration test-debt to clear before the final gate (Task 9.4):**
   - **Editor-gate tests** (`apps/admin/src/components/cms/.../header-editor-gate.test.tsx`,
     `pages-editor-gate.test.tsx`) — 9 fail with `FORGED_IDENTITY`: their fixtures still mint a
     NextAuth-`CONVEX_AUTH_ISSUER` identity, but the operator path now validates
     `CLERK_FRONTEND_API_URL` (Task 2.2). Update the fixtures to a Clerk-issuer identity (+ seed
     `clerkUserId`/`orgMemberships` like the other sibling tests already do).
   - **`cms/prosemirror.ts`** rich-text sync calls `resolveActiveAdminShopId(ctx)` with no
     `shopDomain` (the websocket sync transport carries no selector) → multi-shop operators hit
     `AMBIGUOUS_SHOP_MEMBERSHIP` on rich-text. Single-shop works. Follow-up: thread the routed
     shop into the prosemirror permission callbacks.
8. **Convex `_generated` hand-edits** — offline codegen is unavailable in the worktree, so
   `packages/convex/convex/_generated/dataModel.d.ts` is hand-synced as the schema evolves
   (Tasks 1.1–1.4, 3.x). **Deploy checklist:** run real `convex codegen` against the
   deployment before/at deploy and confirm `_generated/` matches the live schema (no drift).
9. **Rebase-surfaced fixes to clear before merge** (CI is red on these by design; intentionally
   deferred — re-rebased onto master without touching them):
   - **`packages/test-convex/src/unit.test.ts`** (`FORGED_IDENTITY`) — the round-trip exercises the
     tenant tier, which now validates a **Clerk** operator, but the test still stubs
     `CONVEX_AUTH_ISSUER` and feeds a NextAuth-shaped identity. Fix: `vi.stubEnv('CLERK_FRONTEND_API_URL', …)`
     instead, and a Clerk-shaped `subject` (`user_…`). Latent until now because test-convex's turbo
     `test` cache key excludes `packages/convex/**`, so the source change never invalidated its shard —
     the rebase forced a fresh run that surfaced it.
   - **Storefront `search/search-content-gate.test.tsx`** (3 fails) — **master-introduced**, not this
     migration. `SearchContentGate` is an `async` server component (`await SearchApi(...)`) that the
     test sync-`render`s without mocking `@/api/_loaders`, so the promise never resolves and nothing
     renders (`[data-testid="search-content"]` missing). Arrives with master's search-singleton feature;
     fix by mocking `SearchApi` (or awaiting the rendered output) in that spec.
   - **CI convex auth-config env** — the `convex` CLI statically scans `auth.config.ts` for
     `process.env.*` refs and hard-errors when they are unset on the target backend:
     `CONVEX_AUTH_ISSUER` and now `CLERK_FRONTEND_API_URL_PROD`. Fix: set BOTH (plus the existing
     `CLERK_FRONTEND_API_URL`) on the ephemeral local backend CI boots via the `startConvex()` harness,
     so codegen / `deploy --dry-run` validation passes against a local convex db rather than a
     misconfigured remote.

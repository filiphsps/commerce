# Admin Account Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the placeholder operator account page into a real, fully-tested account settings page (editable name, read-only Gravatar avatar, account info, connected accounts, theme preference), backed by an authorized Convex self-update seam and a persisted, light-ready admin theme.

**Architecture:** A new `account/self` Convex seam (`get` query + `update` mutation) built on the **customer-tier `authedMutation`/`authedQuery`** constructors, so a caller can only read/patch its **own** email-keyed `users` row (identity from the trusted token, never a client arg). The admin reaches it through a per-request identity-authenticated client (operator token), mirroring `editor-convex-bridge.ts`. Avatar becomes Gravatar-derived (admin-only, from email hash), replacing the GitHub source. Theme is a persisted `users.preferences.theme` (`dark`|`system`) mirrored to a cookie that drives a no-flash, light-ready theme provider. The page composes a reusable `SettingsSection` card with `TextField`/`Button` and a segmented theme control.

**Tech Stack:** Next.js 16 App Router (RSC + server actions), Convex (`convex-test`), NextAuth v5, Tailwind v4 + Radix primitives, `sonner` toasts, Vitest + `@testing-library/react` (happy-dom), Playwright.

---

## Conventions for every task

- **Run the app's checks the repo way:**
  - Single test file (any package): `pnpm test <path-to-test-file>` (root vitest filters by path across projects).
  - Convex package tests: `pnpm --filter @nordcom/commerce-convex test` (optionally append a path).
  - Limit-boundary gate (after any `packages/convex/**` change): `pnpm --filter @nordcom/commerce-test-convex run test src/limits`.
  - Typecheck: `pnpm typecheck` (or `pnpm --filter @nordcom/commerce-admin typecheck`).
  - Lint/format (Biome): `pnpm lint`.
  - E2E (admin): `pnpm --filter @nordcom/commerce-admin test:e2e`.
- **Fresh checkout:** run `pnpm build:packages` once before lint/typecheck/test.
- **After editing any file:** check LSP diagnostics and fix before moving on.
- **No changeset** is required (both touched packages are in the changeset ignore list).
- **Commits:** Conventional Commits with scope, imperative lowercase subject, trailing period. Commit on local `master` at each phase boundary (steps explicitly marked **Commit**).
- **JSDoc** on every new function/component; **American English**; **trailing slashes** on internal links.

---

## File Structure

**Create:**
- `packages/convex/convex/account/self.ts` — `get` (authedQuery) + `update` (authedMutation); the authorized self-read/self-write seam.
- `packages/convex/convex/account/self.test.ts` — convex-test coverage (auth boundary, validation, caller-scoping, round-trip).
- `apps/admin/src/utils/gravatar.ts` — `gravatarUrl(email, opts)`.
- `apps/admin/src/utils/gravatar.test.ts`
- `apps/admin/src/utils/theme.ts` — theme types, cookie name, `parseThemePreference`, `resolveAppliedTheme`.
- `apps/admin/src/utils/theme.test.ts`
- `apps/admin/src/components/theme/theme-script.tsx` — no-flash inline script.
- `apps/admin/src/components/theme/theme-script.test.tsx`
- `apps/admin/src/components/theme/theme-provider.tsx` — client provider + `useTheme`.
- `apps/admin/src/components/theme/theme-provider.test.tsx`
- `apps/admin/src/components/settings/settings-section.tsx` — reusable card.
- `apps/admin/src/components/settings/settings-section.test.tsx`
- `apps/admin/src/lib/account-convex.ts` — `getOwnAccount()` / `updateOwnAccount()` bridge.
- `apps/admin/src/app/(app)/(user)/accounts/actions.ts` — `saveAccountName` / `saveThemePreference` server actions.
- `apps/admin/src/app/(app)/(user)/accounts/actions.test.ts`
- `apps/admin/src/app/(app)/(user)/accounts/profile-form.tsx` — client name form.
- `apps/admin/src/app/(app)/(user)/accounts/profile-form.test.tsx`
- `apps/admin/src/app/(app)/(user)/accounts/theme-toggle.tsx` — segmented Dark/System control.
- `apps/admin/src/app/(app)/(user)/accounts/theme-toggle.test.tsx`
- `apps/admin/src/app/(app)/(user)/accounts/account-page.test.tsx` — page composition test.
- `apps/admin/e2e/account-settings.spec.ts` — Playwright e2e.

**Modify:**
- `packages/convex/convex/tables/auth.ts` — add `userPreferencesValidator` + `preferences` on `userValidator`.
- `apps/admin/src/utils/auth.config.ts` — `image` from Gravatar instead of `avatar_url`.
- `apps/admin/src/lib/cms-ctx.ts` — expose `name` (+ `avatar`) on `AuthedCmsCtx['user']`.
- `apps/admin/src/app/(app)/(dashboard)/[domain]/layout.tsx` — pass `name` + Gravatar `image` to the shell.
- `apps/admin/src/components/shell/account-menu.test.tsx` — assert image/name wiring (if the file exists; otherwise add it).
- `apps/admin/src/app/(app)/layout.tsx` — read theme cookie, render `ThemeScript`, wrap in `ThemeProvider`, un-pin hardcoded `data-theme`.
- `apps/admin/src/app/(app)/(user)/accounts/page.tsx` — replace placeholder with composed sections.

---

# Phase 1 — Convex: theme preference + authorized self-update seam

### Task 1.1: Add `preferences.theme` to the user schema

**Files:**
- Modify: `packages/convex/convex/tables/auth.ts`

- [ ] **Step 1: Add the preferences validator and field**

In `packages/convex/convex/tables/auth.ts`, add immediately **above** `export const userValidator`:

```ts
/**
 * Per-user UI preferences embedded on the platform user. Optional end-to-end so existing rows
 * (which predate this field) validate unchanged. `theme` is the operator's admin theme choice:
 * `'system'` follows the OS, `'dark'` pins dark. There is no `'light'` value yet because the admin
 * has no light token set; the choice is persisted and applied (light-ready) but visually inert until
 * a `[data-theme="light"]` block lands.
 */
export const userPreferencesValidator = v.object({
    theme: v.optional(v.union(v.literal('dark'), v.literal('system'))),
});

/**
 * Inferred per-user preferences shape. See {@link userPreferencesValidator}.
 */
export type UserPreferences = Infer<typeof userPreferencesValidator>;
```

Then add `preferences` to `userValidator` (after `identities`, before the `...timestampFields` spread):

```ts
export const userValidator = v.object({
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    emailVerified: v.union(v.number(), v.null()),
    groups: v.optional(v.array(v.string())),
    identities: v.array(embeddedIdentityValidator),
    preferences: v.optional(userPreferencesValidator),
    ...timestampFields,
});
```

- [ ] **Step 2: Regenerate Convex types**

Run: `pnpm --filter @nordcom/commerce-convex codegen`
Expected: regenerates `_generated/` with `preferences` on the `users` doc type; exits 0.

- [ ] **Step 3: Typecheck the convex package**

Run: `pnpm --filter @nordcom/commerce-convex typecheck`
Expected: PASS (the optional field is backward-compatible with every existing reader/writer).

### Task 1.2: Write the failing `account/self` test

**Files:**
- Create: `packages/convex/convex/account/self.test.ts`

- [ ] **Step 1: Write the test** (mirrors `account/profile.test.ts`'s harness)

```ts
import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorCode } from '../lib/auth';
import { systemMutation } from '../lib/system';
import schema from '../schema';
import * as self from './self';

const TRUSTED_ISSUER = 'https://storefront.test.nordcom.io';

/** Seeds a platform user directly through the system tier (unscoped write to a platform-global table). */
const seedUser = systemMutation({
    args: { email: v.string(), name: v.string() },
    handler: async (ctx, { email, name }) => {
        const now = 1_700_000_000_000;
        return ctx.db.insert('users', {
            email,
            name,
            emailVerified: null,
            identities: [
                {
                    id: 'identity-1',
                    provider: 'github',
                    identity: 'gh-1',
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            createdAt: now,
            updatedAt: now,
        });
    },
});

/** Reads a user's stored name + theme straight from the row (assertion probe). */
const readUser = systemMutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
        const row = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .first();
        return row ? { name: row.name, theme: row.preferences?.theme ?? null } : null;
    },
});

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/account/self.ts': () => Promise.resolve(self),
    '/convex/account/self.test.ts': () => Promise.resolve({ seedUser, readUser }),
};

const seedUserRef = makeFunctionReference<'mutation'>('account/self.test:seedUser');
const readUserRef = makeFunctionReference<'mutation', { email: string }, { name: string; theme: string | null } | null>(
    'account/self.test:readUser',
);
const getRef = makeFunctionReference<'query', Record<string, never>, self.AccountSelf>('account/self:get');
const updateRef = makeFunctionReference<'mutation', { name?: string; theme?: 'dark' | 'system' }, self.AccountSelf>(
    'account/self:update',
);

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('account/self:get', () => {
    it('returns the caller-scoped account view with a default theme', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Op Erator' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });

        await expect(asOp.query(getRef, {})).resolves.toMatchObject({
            name: 'Op Erator',
            email: 'op@example.com',
            emailVerified: null,
            theme: 'system',
            identities: [{ provider: 'github', identity: 'gh-1' }],
        });
    });

    it('rejects unauthenticated, forged-issuer, email-less, and unknown-user identities', async () => {
        const t = convexTest(schema, modules);

        await expect(t.query(getRef, {})).rejects.toMatchObject({ data: { code: AuthErrorCode.UNAUTHENTICATED } });

        const asForged = t.withIdentity({ issuer: 'https://evil.example.com', subject: 'x', email: 'op@example.com' });
        await expect(asForged.query(getRef, {})).rejects.toMatchObject({ data: { code: AuthErrorCode.FORGED_IDENTITY } });

        const asEmailless = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'x' });
        await expect(asEmailless.query(getRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.IDENTITY_WITHOUT_EMAIL },
        });

        const asStranger = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'x', email: 'stranger@example.com' });
        await expect(asStranger.query(getRef, {})).rejects.toMatchObject({ data: { code: AuthErrorCode.UNKNOWN_USER } });
    });
});

describe('account/self:update', () => {
    it('updates the caller’s name and theme and returns the fresh view', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Old Name' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });

        await expect(asOp.mutation(updateRef, { name: '  New Name  ', theme: 'dark' })).resolves.toMatchObject({
            name: 'New Name',
            theme: 'dark',
        });
        await expect(t.mutation(readUserRef, { email: 'op@example.com' })).resolves.toEqual({
            name: 'New Name',
            theme: 'dark',
        });
    });

    it('supports partial updates: theme-only leaves the name intact', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Keep Me' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });
        await asOp.mutation(updateRef, { theme: 'system' });

        await expect(t.mutation(readUserRef, { email: 'op@example.com' })).resolves.toEqual({
            name: 'Keep Me',
            theme: 'system',
        });
    });

    it('rejects an empty or whitespace-only name', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Old Name' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });
        await expect(asOp.mutation(updateRef, { name: '   ' })).rejects.toMatchObject({
            data: { code: self.AccountErrorCode.INVALID_NAME },
        });
        // The rejected write left the row untouched.
        await expect(t.mutation(readUserRef, { email: 'op@example.com' })).resolves.toEqual({
            name: 'Old Name',
            theme: null,
        });
    });

    it('keeps writes caller-scoped: updating as A never touches B', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'a@example.com', name: 'A' });
        await t.mutation(seedUserRef, { email: 'b@example.com', name: 'B' });

        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'a', email: 'a@example.com' });
        await asA.mutation(updateRef, { name: 'A Renamed', theme: 'dark' });

        await expect(t.mutation(readUserRef, { email: 'b@example.com' })).resolves.toEqual({ name: 'B', theme: null });
    });

    it('rejects unauthenticated and forged identities', async () => {
        const t = convexTest(schema, modules);

        await expect(t.mutation(updateRef, { name: 'x' })).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });

        const asForged = t.withIdentity({ issuer: 'https://evil.example.com', subject: 'x', email: 'op@example.com' });
        await expect(asForged.mutation(updateRef, { name: 'x' })).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @nordcom/commerce-convex test account/self.test.ts`
Expected: FAIL — `Cannot find module './self'` (the seam does not exist yet).

### Task 1.3: Implement the `account/self` seam

**Files:**
- Create: `packages/convex/convex/account/self.ts`

- [ ] **Step 1: Write the implementation**

```ts
import { ConvexError, v } from 'convex/values';

import { authedMutation, authedQuery } from '../_constructors';
import { AuthErrorCode } from '../lib/auth';

/**
 * Maximum accepted display-name length. A defensive bound on a free-text field the operator edits;
 * the source `users.name` is otherwise unconstrained.
 */
const NAME_MAX_LENGTH = 120;

/**
 * Stable {@link ConvexError} codes specific to the account-self seam (the auth-gate codes come from
 * {@link AuthErrorCode}). Lets the admin server action branch on a code rather than a message.
 */
export const AccountErrorCode = {
    /** `update` was asked to set an empty / whitespace-only / over-long display name. */
    INVALID_NAME: 'ACCOUNT_INVALID_NAME',
} as const;

/**
 * The read-only summary of a linked OAuth identity surfaced on the account page's connected-accounts
 * section — provider name, the provider-scoped id, and when it was linked. Token fields are
 * deliberately omitted: the page never needs them and they must not cross the wire.
 */
export interface AccountIdentity {
    provider: string;
    identity: string;
    createdAt: number;
}

/**
 * The caller's own account view behind the admin wire names `account/self:get` / `account/self:update`.
 * Derived from the caller's platform `users` row (resolved by the customer-tier constructor from the
 * trusted email claim), it is the exact shape the admin account page renders.
 */
export interface AccountSelf {
    name: string;
    email: string;
    emailVerified: number | null;
    createdAt: number;
    theme: 'dark' | 'system';
    identities: AccountIdentity[];
}

/**
 * Projects a `users` row into the wire {@link AccountSelf}, defaulting an absent theme preference to
 * `'system'` so the page always has a concrete selection to render.
 *
 * @param user - The caller's own `users` document.
 * @returns The account view.
 */
function toAccountSelf(user: {
    name: string;
    email: string;
    emailVerified: number | null;
    createdAt: number;
    preferences?: { theme?: 'dark' | 'system' };
    identities: Array<{ provider: string; identity: string; createdAt: number }>;
}): AccountSelf {
    return {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        theme: user.preferences?.theme ?? 'system',
        identities: user.identities.map((identity) => ({
            provider: identity.provider,
            identity: identity.identity,
            createdAt: identity.createdAt,
        })),
    };
}

/**
 * The identity-derived "my account" read behind `account/self:get`: zero client args — the caller is
 * whoever the validated bearer token says, never a spoofable argument. Built on {@link authedQuery},
 * whose customer-scoped db exposes exactly the caller's own email-keyed `users` row.
 *
 * @returns The caller's {@link AccountSelf}.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` from the
 *   constructor's identity resolution; `UNKNOWN_USER` when no `users` row backs the identity.
 */
export const get = authedQuery({
    args: {},
    handler: async (ctx): Promise<AccountSelf> => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', ctx.identityEmail))
            .first();
        if (!user) {
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'No platform user matches the trusted identity.',
            });
        }
        return toAccountSelf(user);
    },
});

/**
 * The self-update behind `account/self:update`: patches the caller's OWN display name and/or theme
 * preference. The row is resolved from the trusted email claim ({@link authedMutation}'s
 * customer-scoped writer can read/patch only that one row), so the args carry new VALUES only — never
 * a target id — and a forged or replayed call can never reshape another operator's row.
 *
 * Both args are optional (partial update): an absent `name` leaves the name untouched, an absent
 * `theme` leaves the preference untouched. A present `name` is trimmed and length-validated.
 *
 * @returns The caller's fresh {@link AccountSelf} after the patch.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` from the
 *   constructor; `UNKNOWN_USER` when no `users` row backs the identity; `ACCOUNT_INVALID_NAME` when a
 *   supplied name is empty, whitespace-only, or longer than {@link NAME_MAX_LENGTH}.
 */
export const update = authedMutation({
    args: {
        name: v.optional(v.string()),
        theme: v.optional(v.union(v.literal('dark'), v.literal('system'))),
    },
    handler: async (ctx, { name, theme }): Promise<AccountSelf> => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', ctx.identityEmail))
            .unique();
        if (!user) {
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'No platform user matches the trusted identity.',
            });
        }

        const patch: { name?: string; preferences?: { theme: 'dark' | 'system' }; updatedAt?: number } = {};

        if (name !== undefined) {
            const trimmed = name.trim();
            if (trimmed.length === 0 || trimmed.length > NAME_MAX_LENGTH) {
                throw new ConvexError({
                    code: AccountErrorCode.INVALID_NAME,
                    message: `Display name must be between 1 and ${NAME_MAX_LENGTH} characters.`,
                });
            }
            patch.name = trimmed;
        }

        if (theme !== undefined) {
            patch.preferences = { ...user.preferences, theme };
        }

        if (patch.name !== undefined || patch.preferences !== undefined) {
            await ctx.db.patch(user._id, { ...patch, updatedAt: Date.now() });
        }

        const updated = await ctx.db.get(user._id);
        if (!updated) {
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'Account row vanished during update.',
            });
        }
        return toAccountSelf(updated);
    },
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-convex test account/self.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 3: Run the full convex suite + limit-boundary gate**

Run: `pnpm --filter @nordcom/commerce-convex test`
Then: `pnpm --filter @nordcom/commerce-test-convex run test src/limits`
Expected: both PASS (the optional schema field is backward-compatible; seed/limit suites unaffected).

- [ ] **Step 4: Commit**

```bash
git add packages/convex/convex/tables/auth.ts packages/convex/convex/account/self.ts packages/convex/convex/account/self.test.ts packages/convex/convex/_generated
git commit -m "feat(convex): add user theme preference and authorized account self-update seam."
```

---

# Phase 2 — Admin: Gravatar avatars (admin-only)

### Task 2.1: Gravatar URL helper

**Files:**
- Create: `apps/admin/src/utils/gravatar.ts`
- Create: `apps/admin/src/utils/gravatar.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { gravatarUrl } from './gravatar';

describe('gravatarUrl', () => {
    it('builds a gravatar URL with a 64-char SHA-256 hash and default params', () => {
        const url = gravatarUrl('person@example.com');
        const match = url.match(/^https:\/\/www\.gravatar\.com\/avatar\/([a-f0-9]{64})\?(.+)$/);
        expect(match).not.toBeNull();
        expect(url).toContain('d=mp');
        expect(url).toContain('s=160');
    });

    it('normalizes case and surrounding whitespace before hashing', () => {
        expect(gravatarUrl('  Person@Example.com ')).toBe(gravatarUrl('person@example.com'));
    });

    it('honors size and default-image overrides', () => {
        const url = gravatarUrl('person@example.com', { size: 64, defaultImage: 'identicon' });
        expect(url).toContain('s=64');
        expect(url).toContain('d=identicon');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test apps/admin/src/utils/gravatar.test.ts`
Expected: FAIL — `Cannot find module './gravatar'`.

- [ ] **Step 3: Implement**

```ts
import { createHash } from 'node:crypto';

/**
 * Options for {@link gravatarUrl}.
 */
export interface GravatarOptions {
    /** Requested square pixel size (Gravatar `s`). Defaults to 160. */
    size?: number;
    /** Fallback image style when the email has no Gravatar (Gravatar `d`). Defaults to `'mp'` (mystery-person). */
    defaultImage?: string;
}

/**
 * Derives the Gravatar image URL for an email address. ADMIN-ONLY: this is the operator avatar
 * source; the storefront's customer avatars are unaffected. Deterministic and storage-free — the
 * URL is a pure function of the normalized email — so it is always current and needs no migration of
 * stored avatars. Uses the SHA-256 address hash (Gravatar's recommended scheme) over the trimmed,
 * lowercased email.
 *
 * @param email - The operator's email address.
 * @param options - Optional size and default-image overrides.
 * @returns The Gravatar avatar URL.
 */
export function gravatarUrl(email: string, options: GravatarOptions = {}): string {
    const { size = 160, defaultImage = 'mp' } = options;
    const normalized = email.trim().toLowerCase();
    const hash = createHash('sha256').update(normalized).digest('hex');
    const params = new URLSearchParams({ d: defaultImage, s: String(size) });
    return `https://www.gravatar.com/avatar/${hash}?${params.toString()}`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test apps/admin/src/utils/gravatar.test.ts`
Expected: PASS.

### Task 2.2: Point the auth profile + shell at Gravatar

**Files:**
- Modify: `apps/admin/src/utils/auth.config.ts`
- Modify: `apps/admin/src/lib/cms-ctx.ts`
- Modify: `apps/admin/src/app/(app)/(dashboard)/[domain]/layout.tsx`

- [ ] **Step 1: Source the session image from Gravatar**

In `apps/admin/src/utils/auth.config.ts`, add the import at the top (after the existing imports):

```ts
import { gravatarUrl } from '@/utils/gravatar';
```

Then change the GitHub `profile` callback so `image` is Gravatar-derived from the resolved email (keeping the existing `email || login` fallback):

```ts
            profile({ id, name, email, login, avatar_url }) {
                const resolvedEmail = email || login;
                return {
                    id: id.toString(),
                    name: name,
                    email: resolvedEmail,
                    // Operator avatars come from Gravatar (admin-only), not GitHub. `avatar_url` is
                    // intentionally unused; the image is a pure function of the email so it stays
                    // consistent with the account page and the shell header.
                    image: gravatarUrl(resolvedEmail),
                };
            },
```

> Note: `avatar_url` is now unused in the destructure. Per the no-unused-vars rule, drop it: `profile({ id, name, email, login })`.

- [ ] **Step 2: Expose `name` on the authed CMS context**

In `apps/admin/src/lib/cms-ctx.ts`, add `name` to the `user` shape of `AuthedCmsCtx`:

```ts
    user: {
        id: string;
        email: string;
        name: string;
        role: 'admin' | 'editor';
        tenants: Array<{ tenant: string }>;
        collection: 'users';
    };
```

And populate it from the already-fetched `userDoc` in the return value:

```ts
        user: {
            id: userId,
            email: userDoc.email,
            name: userDoc.name,
            role,
            tenants: collaborations.map((collaborated) => ({ tenant: String(collaborated.id) })),
            collection: 'users',
        },
```

- [ ] **Step 3: Pass name + Gravatar image into the shell header**

In `apps/admin/src/app/(app)/(dashboard)/[domain]/layout.tsx`, add the import:

```ts
import { gravatarUrl } from '@/utils/gravatar';
```

Replace the `user={{ ... }}` prop passed to `<ShellHeader>` (currently `name: undefined`, no image):

```tsx
            user={{
                name: user.name,
                email: user.email ?? undefined,
                image: gravatarUrl(user.email),
                role: user.role,
            }}
```

- [ ] **Step 4: Cover the shell wiring**

Create or extend `apps/admin/src/components/shell/account-menu.test.tsx` to assert that, given a `user` with `image` + `name`, the menu renders the avatar image and the name:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
    it('renders the avatar image and display name when provided', () => {
        const { container, getAllByText } = render(
            <AccountMenu
                user={{
                    name: 'Op Erator',
                    email: 'op@example.com',
                    image: 'https://www.gravatar.com/avatar/abc?d=mp&s=160',
                    role: 'admin',
                }}
            />,
        );
        // Radix renders the trigger eagerly; the image element carries the gravatar src.
        const img = container.querySelector('img');
        expect(img?.getAttribute('src')).toContain('gravatar.com/avatar/');
        expect(getAllByText('Op Erator').length).toBeGreaterThan(0);
    });
});
```

> If a Radix avatar image does not mount in happy-dom without an `onLoadingStatusChange`, assert the fallback initials (`getAllByText('OE')`) instead and assert the `image` prop is forwarded by querying the trigger. Keep whichever assertion is green; the goal is that the wiring is exercised.

- [ ] **Step 5: Run the affected tests + typecheck**

Run: `pnpm test apps/admin/src/utils/gravatar.test.ts apps/admin/src/components/shell/account-menu.test.tsx`
Then: `pnpm --filter @nordcom/commerce-admin typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/utils/gravatar.ts apps/admin/src/utils/gravatar.test.ts apps/admin/src/utils/auth.config.ts apps/admin/src/lib/cms-ctx.ts "apps/admin/src/app/(app)/(dashboard)/[domain]/layout.tsx" apps/admin/src/components/shell/account-menu.test.tsx
git commit -m "feat(admin): derive operator avatars from gravatar."
```

---

# Phase 3 — Admin: persisted, light-ready theme

### Task 3.1: Theme types + pure helpers

**Files:**
- Create: `apps/admin/src/utils/theme.ts`
- Create: `apps/admin/src/utils/theme.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME_PREFERENCE, parseThemePreference, resolveAppliedTheme } from './theme';

describe('parseThemePreference', () => {
    it('accepts the two valid preferences', () => {
        expect(parseThemePreference('dark')).toBe('dark');
        expect(parseThemePreference('system')).toBe('system');
    });
    it('falls back to the default for anything else', () => {
        expect(parseThemePreference('light')).toBe(DEFAULT_THEME_PREFERENCE);
        expect(parseThemePreference(undefined)).toBe(DEFAULT_THEME_PREFERENCE);
        expect(parseThemePreference(null)).toBe(DEFAULT_THEME_PREFERENCE);
    });
});

describe('resolveAppliedTheme', () => {
    it('pins dark for the dark preference regardless of system', () => {
        expect(resolveAppliedTheme('dark', true)).toBe('dark');
        expect(resolveAppliedTheme('dark', false)).toBe('dark');
    });
    it('follows the system signal for the system preference', () => {
        expect(resolveAppliedTheme('system', true)).toBe('light');
        expect(resolveAppliedTheme('system', false)).toBe('dark');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test apps/admin/src/utils/theme.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
/**
 * The operator's persisted theme choice. `'system'` follows the OS; `'dark'` pins dark. There is no
 * `'light'` choice yet — the admin has no light token set — but the value space and resolution are
 * light-ready: a `[data-theme="light"]` block is the only missing piece.
 */
export type ThemePreference = 'dark' | 'system';

/**
 * The concrete theme actually applied to `<html data-theme>`. `'light'` is resolvable today (when the
 * preference is `'system'` and the OS prefers light) but visually identical to `'dark'` until light
 * tokens exist.
 */
export type AppliedTheme = 'dark' | 'light';

/** Cookie name mirroring the persisted {@link ThemePreference} for no-flash SSR. */
export const THEME_COOKIE = 'admin-theme';

/** The default preference for an operator who has never chosen. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/**
 * Narrows an arbitrary cookie/string value to a valid {@link ThemePreference}, falling back to
 * {@link DEFAULT_THEME_PREFERENCE} for anything unrecognized.
 *
 * @param value - The raw value (e.g. a cookie value), possibly absent.
 * @returns A valid theme preference.
 */
export function parseThemePreference(value: string | undefined | null): ThemePreference {
    return value === 'dark' || value === 'system' ? value : DEFAULT_THEME_PREFERENCE;
}

/**
 * Resolves a {@link ThemePreference} to the concrete {@link AppliedTheme}, given whether the system
 * currently prefers light.
 *
 * @param preference - The operator's preference.
 * @param systemPrefersLight - The `prefers-color-scheme: light` signal (only consulted for `'system'`).
 * @returns The theme to apply.
 */
export function resolveAppliedTheme(preference: ThemePreference, systemPrefersLight: boolean): AppliedTheme {
    if (preference === 'dark') {
        return 'dark';
    }
    return systemPrefersLight ? 'light' : 'dark';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test apps/admin/src/utils/theme.test.ts`
Expected: PASS.

### Task 3.2: No-flash inline theme script

**Files:**
- Create: `apps/admin/src/components/theme/theme-script.tsx`
- Create: `apps/admin/src/components/theme/theme-script.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEME_COOKIE } from '@/utils/theme';

import { ThemeScript } from './theme-script';

describe('ThemeScript', () => {
    it('emits a pre-paint script that reads the cookie and sets data-theme', () => {
        const { container } = render(<ThemeScript />);
        const script = container.querySelector('script');
        expect(script).not.toBeNull();
        const source = script?.innerHTML ?? '';
        expect(source).toContain(THEME_COOKIE);
        expect(source).toContain('prefers-color-scheme: light');
        expect(source).toContain('dataset.theme');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test apps/admin/src/components/theme/theme-script.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import { DEFAULT_THEME_PREFERENCE, THEME_COOKIE } from '@/utils/theme';

/**
 * A blocking inline script that runs BEFORE first paint to set `<html data-theme>` from the persisted
 * theme cookie — eliminating a theme flash. For the `'system'` preference (and when the cookie is
 * absent) it consults `prefers-color-scheme` so the resolved theme is correct on the very first frame;
 * for `'dark'` it pins dark. Rendered in `<head>` ahead of the app tree. The `ThemeProvider` then
 * owns all subsequent runtime updates.
 *
 * @returns The inline `<script>` element.
 */
export function ThemeScript() {
    const source = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):'${DEFAULT_THEME_PREFERENCE}';if(p!=='dark'&&p!=='system'){p='${DEFAULT_THEME_PREFERENCE}';}var applied=p==='dark'?'dark':(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=applied;}catch(e){}})();`;
    return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: source }} />;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test apps/admin/src/components/theme/theme-script.test.tsx`
Expected: PASS.

### Task 3.3: Client theme provider + `useTheme`

**Files:**
- Create: `apps/admin/src/components/theme/theme-provider.tsx`
- Create: `apps/admin/src/components/theme/theme-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider, useTheme } from './theme-provider';

function Probe() {
    const { preference, setPreference } = useTheme();
    return (
        <button type="button" data-pref={preference} onClick={() => setPreference('dark')}>
            toggle
        </button>
    );
}

describe('ThemeProvider', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
        document.cookie = 'admin-theme=; max-age=0; path=/';
    });
    afterEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });

    it('applies the initial preference to <html data-theme> on mount', () => {
        render(
            <ThemeProvider initialPreference="dark">
                <Probe />
            </ThemeProvider>,
        );
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('updates data-theme and writes the cookie when the preference changes', () => {
        const { getByRole } = render(
            <ThemeProvider initialPreference="system">
                <Probe />
            </ThemeProvider>,
        );
        act(() => {
            getByRole('button').click();
        });
        expect(getByRole('button').getAttribute('data-pref')).toBe('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(document.cookie).toContain('admin-theme=dark');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test apps/admin/src/components/theme/theme-provider.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resolveAppliedTheme, THEME_COOKIE, type ThemePreference } from '@/utils/theme';

/**
 * The theme context surface: the current {@link ThemePreference} and a setter that applies it,
 * mirrors it to the cookie, and (for `'system'`) keeps tracking the OS signal.
 */
export interface ThemeContextValue {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Applies a preference to `<html data-theme>`, resolving `'system'` against the live OS signal.
 *
 * @param preference - The preference to apply.
 */
function applyPreference(preference: ThemePreference): void {
    const prefersLight =
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.dataset.theme = resolveAppliedTheme(preference, prefersLight);
}

/**
 * Shell-level theme controller. Holds the operator's {@link ThemePreference}, applies it to
 * `<html data-theme>`, mirrors changes to the `admin-theme` cookie (for no-flash SSR), and — while on
 * `'system'` — re-applies when the OS scheme flips. Persistence to the user record is the caller's job
 * (the account toggle calls the server action), keeping this provider serializable from the server
 * layout and decoupled from any one feature.
 *
 * @param props.initialPreference - The server-resolved preference (from the cookie).
 * @param props.children - The app tree.
 */
export function ThemeProvider({
    initialPreference,
    children,
}: {
    initialPreference: ThemePreference;
    children: ReactNode;
}) {
    const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

    useEffect(() => {
        applyPreference(preference);
        if (preference !== 'system') {
            return;
        }
        const media = window.matchMedia('(prefers-color-scheme: light)');
        const handler = () => applyPreference('system');
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, [preference]);

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        applyPreference(next);
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    }, []);

    const value = useMemo<ThemeContextValue>(() => ({ preference, setPreference }), [preference, setPreference]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the theme context.
 *
 * @returns The current preference and its setter.
 * @throws {Error} When called outside a {@link ThemeProvider}.
 */
export function useTheme(): ThemeContextValue {
    const value = useContext(ThemeContext);
    if (!value) {
        throw new Error('useTheme must be used within a ThemeProvider.');
    }
    return value;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test apps/admin/src/components/theme/theme-provider.test.tsx`
Expected: PASS.

### Task 3.4: Wire the provider into the app shell (un-pin hardcoded dark)

**Files:**
- Modify: `apps/admin/src/app/(app)/layout.tsx`

- [ ] **Step 1: Update the root app-shell layout**

Replace the contents of `apps/admin/src/app/(app)/layout.tsx` with:

```tsx
import '../globals.css';

import { GeistMono } from 'geist/font/mono';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { PreviewBanner } from '@/components/preview-banner';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { primaryFont } from '@/utils/fonts';
import { parseThemePreference, THEME_COOKIE } from '@/utils/theme';
import { cn } from '@/utils/tailwind';

/**
 * Root admin shell layout. Resolves the operator's persisted theme preference from the `admin-theme`
 * cookie and renders a pre-paint {@link ThemeScript} so `<html data-theme>` is correct on the first
 * frame, then hands the preference to the client {@link ThemeProvider} for runtime control.
 *
 * The server default for `data-theme` stays `"dark"` (the only token set that exists today and the
 * correct fallback for `'system'`, which the server cannot resolve); the inline script corrects it to
 * the OS-resolved value before paint, so this is light-ready without a flash.
 *
 * @param props.children - The application subtree.
 * @returns The root HTML document.
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
    const cookieStore = await cookies();
    const preference = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);

    return (
        <html
            lang="en"
            data-theme="dark"
            className={cn(primaryFont.className, primaryFont.variable, GeistMono.variable)}
        >
            <head>
                <ThemeScript />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className="font-sans">
                <ThemeProvider initialPreference={preference}>
                    <PreviewBanner />
                    <Providers>{children}</Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @nordcom/commerce-admin typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/utils/theme.ts apps/admin/src/utils/theme.test.ts apps/admin/src/components/theme "apps/admin/src/app/(app)/layout.tsx"
git commit -m "feat(admin): drive the shell theme from a persisted preference."
```

---

# Phase 4 — Admin: the account settings page

### Task 4.1: Account Convex bridge (read + write)

**Files:**
- Create: `apps/admin/src/lib/account-convex.ts`

> Mirrors `editor-convex-bridge.ts`'s per-call identity-client contract. No active-shop claim is needed (the seam is tenant-less), so the minter passes the operator identity straight through.

- [ ] **Step 1: Implement the bridge**

```ts
import 'server-only';

import { convexIdentityMutation, convexIdentityQuery, createConvexIdentityClient } from '@nordcom/commerce-db';
import { ConvexOperatorTokenMintError } from '@nordcom/commerce-errors';

import { authenticateConvexClient, type ConvexOperatorIdentity } from './convex-auth';
import { isOperatorTokenMintingConfigured, mintConvexOperatorToken } from './convex-token';

/**
 * The read-only summary of a linked OAuth identity the account page renders. Mirrors the Convex
 * `AccountIdentity` wire shape.
 */
export interface AccountIdentity {
    provider: string;
    identity: string;
    createdAt: number;
}

/**
 * The caller's own account view — the wire shape of `account/self:get` / `account/self:update`.
 */
export interface AccountSelf {
    name: string;
    email: string;
    emailVerified: number | null;
    createdAt: number;
    theme: 'dark' | 'system';
    identities: AccountIdentity[];
}

/**
 * Minter for the account seam: the seam is tenant-less, so the operator identity is signed as-is (no
 * active-shop claim).
 *
 * @param operator - The session-derived operator identity.
 * @returns The signed compact JWT, or `null` when minting is unconfigured/fails.
 */
const mintAccountToken = (operator: ConvexOperatorIdentity) => mintConvexOperatorToken(operator);

/**
 * Builds the mint-failure error, upgrading the message when the cause is an unconfigured minter.
 *
 * @param context - The Convex function path that needed the token.
 * @returns The error to throw.
 */
function mintError(context: string): ConvexOperatorTokenMintError {
    if (!isOperatorTokenMintingConfigured()) {
        return new ConvexOperatorTokenMintError(
            `${context} — operator token minting is not configured; set CONVEX_AUTH_PRIVATE_KEY (plus CONVEX_AUTH_ISSUER / CONVEX_AUTH_APPLICATION_ID), see apps/admin/.env.example`,
        );
    }
    return new ConvexOperatorTokenMintError(context);
}

/**
 * Reads the current operator's own account view on a fresh identity-authenticated client.
 *
 * @returns The caller's {@link AccountSelf}.
 * @throws {ConvexOperatorTokenMintError} When no operator token can be minted (unauthenticated or
 *   unconfigured RS256 material).
 */
export async function getOwnAccount(): Promise<AccountSelf> {
    const client = createConvexIdentityClient();
    const token = await authenticateConvexClient(client, mintAccountToken);
    if (!token) {
        throw mintError('account/self:get');
    }
    return convexIdentityQuery<AccountSelf>(client, 'account/self:get', {});
}

/**
 * Updates the current operator's own name and/or theme preference. Absent fields are omitted from the
 * wire args (Convex rejects explicit `undefined`).
 *
 * @param args - The new display name and/or theme.
 * @returns The fresh {@link AccountSelf} after the patch.
 * @throws {ConvexOperatorTokenMintError} When no operator token can be minted.
 */
export async function updateOwnAccount(args: { name?: string; theme?: 'dark' | 'system' }): Promise<AccountSelf> {
    const client = createConvexIdentityClient();
    const token = await authenticateConvexClient(client, mintAccountToken);
    if (!token) {
        throw mintError('account/self:update');
    }
    const wireArgs: Record<string, unknown> = {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.theme !== undefined ? { theme: args.theme } : {}),
    };
    return convexIdentityMutation<AccountSelf>(client, 'account/self:update', wireArgs);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @nordcom/commerce-admin typecheck`
Expected: PASS (confirms `convex-token`/`convex-auth` exports `isOperatorTokenMintingConfigured`, `mintConvexOperatorToken`, `authenticateConvexClient`, `ConvexOperatorIdentity` as used). If `isOperatorTokenMintingConfigured` is not exported from `./convex-token`, import it from wherever `editor-convex-bridge.ts` imports it (it uses the same symbol) — match that import exactly.

### Task 4.2: Server actions

**Files:**
- Create: `apps/admin/src/app/(app)/(user)/accounts/actions.ts`
- Create: `apps/admin/src/app/(app)/(user)/accounts/actions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const updateOwnAccount = vi.fn();
const revalidatePath = vi.fn();
const cookieSet = vi.fn();

vi.mock('@/lib/account-convex', () => ({ updateOwnAccount }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve({ set: cookieSet }) }));

import { saveAccountName, saveThemePreference } from './actions';

describe('saveAccountName', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.resetAllMocks());

    it('persists the trimmed name, revalidates, and returns the account', async () => {
        updateOwnAccount.mockResolvedValue({ name: 'New Name', theme: 'system' });
        const result = await saveAccountName('  New Name  ');
        expect(updateOwnAccount).toHaveBeenCalledWith({ name: 'New Name' });
        expect(revalidatePath).toHaveBeenCalledWith('/accounts/');
        expect(result).toEqual({ ok: true, account: { name: 'New Name', theme: 'system' } });
    });

    it('returns a failure result with the error message on throw', async () => {
        updateOwnAccount.mockRejectedValue(new Error('nope'));
        const result = await saveAccountName('X');
        expect(result).toEqual({ ok: false, error: 'nope' });
    });
});

describe('saveThemePreference', () => {
    beforeEach(() => vi.clearAllMocks());

    it('persists the theme, mirrors the cookie, and revalidates the layout', async () => {
        updateOwnAccount.mockResolvedValue({ name: 'N', theme: 'dark' });
        const result = await saveThemePreference('dark');
        expect(updateOwnAccount).toHaveBeenCalledWith({ theme: 'dark' });
        expect(cookieSet).toHaveBeenCalledWith('admin-theme', 'dark', expect.objectContaining({ path: '/' }));
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        expect(result).toEqual({ ok: true });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/actions.test.ts"`
Expected: FAIL — module `./actions` not found.

- [ ] **Step 3: Implement**

```ts
'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { type AccountSelf, updateOwnAccount } from '@/lib/account-convex';
import { THEME_COOKIE, type ThemePreference } from '@/utils/theme';

/** A discriminated result the client forms branch on for toast feedback. */
export type AccountActionResult<T> = { ok: true; account: T } | { ok: false; error: string };

/**
 * Extracts a human-readable message from an unknown thrown value, preferring a Convex error payload's
 * `message` when present.
 *
 * @param error - The caught value.
 * @returns The message to surface.
 */
function messageOf(error: unknown): string {
    if (error && typeof error === 'object' && 'data' in error) {
        const data = (error as { data?: unknown }).data;
        if (data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string') {
            return (data as { message: string }).message;
        }
    }
    return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * Persists the operator's display name. Trims the input, delegates validation to the Convex seam
 * (which is the source of truth), revalidates the account route, and returns a result the form
 * surfaces as a toast.
 *
 * @param name - The new display name (untrimmed).
 * @returns Success with the fresh account, or failure with a message.
 */
export async function saveAccountName(name: string): Promise<AccountActionResult<AccountSelf>> {
    try {
        const account = await updateOwnAccount({ name: name.trim() });
        revalidatePath('/accounts/');
        return { ok: true, account };
    } catch (error) {
        return { ok: false, error: messageOf(error) };
    }
}

/**
 * Persists the operator's theme preference, mirrors it to the `admin-theme` cookie (so SSR paints the
 * right theme without a flash), and revalidates the layout. The client provider has already applied
 * the change optimistically; this makes it durable + cross-device.
 *
 * @param theme - The chosen preference.
 * @returns Success, or failure with a message (the toggle reverts on failure).
 */
export async function saveThemePreference(theme: ThemePreference): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        await updateOwnAccount({ theme });
        const cookieStore = await cookies();
        cookieStore.set(THEME_COOKIE, theme, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
        revalidatePath('/', 'layout');
        return { ok: true };
    } catch (error) {
        return { ok: false, error: messageOf(error) };
    }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/actions.test.ts"`
Expected: PASS.

### Task 4.3: Reusable `SettingsSection`

**Files:**
- Create: `apps/admin/src/components/settings/settings-section.tsx`
- Create: `apps/admin/src/components/settings/settings-section.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingsSection } from './settings-section';

describe('SettingsSection', () => {
    it('renders the title, description, body, and footer', () => {
        const { getByText, getByTestId } = render(
            <SettingsSection title="Profile" description="Your details" footer={<span>foot</span>}>
                <div data-testid="body">body</div>
            </SettingsSection>,
        );
        expect(getByText('Profile')).toBeTruthy();
        expect(getByText('Your details')).toBeTruthy();
        expect(getByTestId('body')).toBeTruthy();
        expect(getByText('foot')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test apps/admin/src/components/settings/settings-section.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import type { ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * Props for {@link SettingsSection}.
 */
export interface SettingsSectionProps {
    /** Section heading (rendered as an `<h2>`). */
    title: string;
    /** Optional supporting copy under the heading. */
    description?: string;
    /** The section body. */
    children: ReactNode;
    /** Optional footer region (e.g. a Save button bar). */
    footer?: ReactNode;
    /** Extra classes for the outer card. */
    className?: string;
}

/**
 * A bordered settings card with a titled header, body, and optional footer — the reusable building
 * block for the account page (and any future operator settings surface). Matches the admin's bold,
 * dark, `border-2` card language.
 *
 * @param props - See {@link SettingsSectionProps}.
 * @returns The section element.
 */
export function SettingsSection({ title, description, children, footer, className }: SettingsSectionProps) {
    return (
        <section className={cn('rounded-lg border-2 border-border bg-card', className)}>
            <header className="border-border border-b-2 px-5 py-4">
                <h2 className="font-bold text-sm uppercase tracking-wide">{title}</h2>
                {description ? <p className="mt-1 text-muted-foreground text-sm">{description}</p> : null}
            </header>
            <div className="px-5 py-5">{children}</div>
            {footer ? <footer className="border-border border-t-2 px-5 py-3">{footer}</footer> : null}
        </section>
    );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test apps/admin/src/components/settings/settings-section.test.tsx`
Expected: PASS.

### Task 4.4: Theme toggle (segmented Dark/System)

**Files:**
- Create: `apps/admin/src/app/(app)/(user)/accounts/theme-toggle.tsx`
- Create: `apps/admin/src/app/(app)/(user)/accounts/theme-toggle.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saveThemePreference = vi.fn();
const toastError = vi.fn();

vi.mock('./actions', () => ({ saveThemePreference }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));

import { ThemeProvider } from '@/components/theme/theme-provider';

import { ThemeToggle } from './theme-toggle';

function renderToggle(initialTheme: 'dark' | 'system') {
    return render(
        <ThemeProvider initialPreference={initialTheme}>
            <ThemeToggle initialTheme={initialTheme} />
        </ThemeProvider>,
    );
}

describe('ThemeToggle', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });

    it('marks the active option and persists a new choice', async () => {
        saveThemePreference.mockResolvedValue({ ok: true });
        const { getByRole } = renderToggle('system');
        const dark = getByRole('radio', { name: 'Dark' });
        await act(async () => {
            dark.click();
        });
        expect(dark.getAttribute('aria-checked')).toBe('true');
        expect(saveThemePreference).toHaveBeenCalledWith('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('reverts and toasts on a failed save', async () => {
        saveThemePreference.mockResolvedValue({ ok: false, error: 'boom' });
        const { getByRole } = renderToggle('system');
        await act(async () => {
            getByRole('radio', { name: 'Dark' }).click();
        });
        expect(toastError).toHaveBeenCalled();
        expect(getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('true');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/theme-toggle.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { useEffect, useRef, useTransition } from 'react';
import { toast } from 'sonner';

import { useTheme } from '@/components/theme/theme-provider';
import type { ThemePreference } from '@/utils/theme';
import { cn } from '@/utils/tailwind';

import { saveThemePreference } from './actions';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
];

/**
 * Segmented Dark/System control for the operator's theme preference. Applies the choice instantly via
 * the shell {@link useTheme} provider (cookie + `<html data-theme>`) and persists it durably via the
 * `saveThemePreference` server action; a failed save reverts the selection and toasts. On mount it
 * reconciles the provider with the server-authoritative `initialTheme` so the choice follows the
 * operator across devices.
 *
 * @param props.initialTheme - The server-persisted preference (from the user record).
 * @returns The segmented control.
 */
export function ThemeToggle({ initialTheme }: { initialTheme: ThemePreference }) {
    const { preference, setPreference } = useTheme();
    const [pending, startTransition] = useTransition();
    const reconciled = useRef(false);

    useEffect(() => {
        if (reconciled.current) {
            return;
        }
        reconciled.current = true;
        if (initialTheme !== preference) {
            setPreference(initialTheme);
        }
    }, [initialTheme, preference, setPreference]);

    function choose(value: ThemePreference) {
        if (value === preference || pending) {
            return;
        }
        const previous = preference;
        setPreference(value);
        startTransition(async () => {
            const result = await saveThemePreference(value);
            if (!result.ok) {
                setPreference(previous);
                toast.error('Could not save theme preference.');
            }
        });
    }

    return (
        <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border-2 border-border bg-background p-1">
            {OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={preference === option.value}
                    disabled={pending}
                    onClick={() => choose(option.value)}
                    className={cn(
                        'rounded px-4 py-1.5 font-bold text-xs uppercase tracking-wide transition-colors',
                        preference === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/theme-toggle.test.tsx"`
Expected: PASS.

### Task 4.5: Profile form (editable name)

**Files:**
- Create: `apps/admin/src/app/(app)/(user)/accounts/profile-form.tsx`
- Create: `apps/admin/src/app/(app)/(user)/accounts/profile-form.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saveAccountName = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('./actions', () => ({ saveAccountName }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

import { ProfileForm } from './profile-form';

describe('ProfileForm', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.resetAllMocks());

    it('disables Save until the name is dirty, then persists and toasts', async () => {
        saveAccountName.mockResolvedValue({ ok: true, account: { name: 'Edited' } });
        const { getByLabelText, getByRole } = render(<ProfileForm initialName="Original" />);
        const save = getByRole('button', { name: /save/i });
        expect(save).toBeDisabled();

        fireEvent.change(getByLabelText(/display name/i), { target: { value: 'Edited' } });
        expect(save).not.toBeDisabled();

        await act(async () => {
            fireEvent.submit(save.closest('form') as HTMLFormElement);
        });
        expect(saveAccountName).toHaveBeenCalledWith('Edited');
        expect(toastSuccess).toHaveBeenCalled();
    });

    it('toasts the error and stays dirty on failure', async () => {
        saveAccountName.mockResolvedValue({ ok: false, error: 'too long' });
        const { getByLabelText, getByRole } = render(<ProfileForm initialName="Original" />);
        fireEvent.change(getByLabelText(/display name/i), { target: { value: 'Bad' } });
        await act(async () => {
            fireEvent.submit(getByRole('button', { name: /save/i }).closest('form') as HTMLFormElement);
        });
        expect(toastError).toHaveBeenCalledWith('too long');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/profile-form.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

import { saveAccountName } from './actions';

/** Mirror of the Convex seam's name bound, so the field guards before a round-trip. */
const NAME_MAX_LENGTH = 120;

/**
 * Editable display-name form. The Save button is gated on a non-empty, changed value; submit calls the
 * `saveAccountName` server action and toasts the outcome. The Convex seam remains the source of truth
 * for validation — this only short-circuits the obvious empty case.
 *
 * @param props.initialName - The operator's current display name.
 * @returns The profile form.
 */
export function ProfileForm({ initialName }: { initialName: string }) {
    const [name, setName] = useState(initialName);
    const [saved, setSaved] = useState(initialName);
    const [pending, startTransition] = useTransition();

    const trimmed = name.trim();
    const dirty = trimmed.length > 0 && trimmed !== saved.trim();

    function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!dirty || pending) {
            return;
        }
        startTransition(async () => {
            const result = await saveAccountName(trimmed);
            if (result.ok) {
                setSaved(result.account.name);
                setName(result.account.name);
                toast.success('Profile updated.');
            } else {
                toast.error(result.error || 'Could not update profile.');
            }
        });
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <TextField
                label="Display name"
                value={name}
                onChange={setName}
                maxLength={NAME_MAX_LENGTH}
                autoComplete="name"
                required
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={!dirty || pending}>
                    {pending ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </form>
    );
}
```

> `TextField` is controlled and calls `onChange(value: string)`. Confirm it forwards `value`, `maxLength`, `required`, `autoComplete` to the underlying `<input>` (it spreads `...props`). The `label` ties to the input via `htmlFor`/`id`, so `getByLabelText(/display name/i)` resolves.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/profile-form.test.tsx"`
Expected: PASS.

### Task 4.6: Compose the account page

**Files:**
- Modify: `apps/admin/src/app/(app)/(user)/accounts/page.tsx`
- Create: `apps/admin/src/app/(app)/(user)/accounts/account-page.test.tsx`

- [ ] **Step 1: Write the failing page test** (mock the data + client children to keep it a pure composition test)

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const getOwnAccount = vi.fn();
vi.mock('@/lib/account-convex', () => ({ getOwnAccount }));
vi.mock('@/utils/gravatar', () => ({ gravatarUrl: () => 'https://www.gravatar.com/avatar/abc?d=mp&s=160' }));
vi.mock('./profile-form', () => ({ ProfileForm: ({ initialName }: { initialName: string }) => <div data-testid="profile-form">{initialName}</div> }));
vi.mock('./theme-toggle', () => ({ ThemeToggle: ({ initialTheme }: { initialTheme: string }) => <div data-testid="theme-toggle">{initialTheme}</div> }));

import AccountPage from './page';

describe('AccountPage', () => {
    it('renders every section from the account view', async () => {
        getOwnAccount.mockResolvedValue({
            name: 'Op Erator',
            email: 'op@example.com',
            emailVerified: 1_700_000_000_000,
            createdAt: 1_690_000_000_000,
            theme: 'dark',
            identities: [{ provider: 'github', identity: 'gh-1', createdAt: 1_690_000_000_000 }],
        });

        const ui = await AccountPage();
        const { getByTestId, getByText } = render(ui);

        expect(getByText('op@example.com')).toBeTruthy();
        expect(getByTestId('profile-form').textContent).toBe('Op Erator');
        expect(getByTestId('theme-toggle').textContent).toBe('dark');
        // Connected accounts + Gravatar helper copy.
        expect(getByText(/github/i)).toBeTruthy();
        expect(getByText(/gravatar/i)).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/account-page.test.tsx"`
Expected: FAIL — the current page renders the placeholder, not these sections.

- [ ] **Step 3: Implement the page**

Replace the contents of `apps/admin/src/app/(app)/(user)/accounts/page.tsx` with:

```tsx
import 'server-only';

import { ExternalLink, Github } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { SettingsSection } from '@/components/settings/settings-section';
import { auth } from '@/auth';
import { getOwnAccount } from '@/lib/account-convex';
import { gravatarUrl } from '@/utils/gravatar';

import { ProfileForm } from './profile-form';
import { ThemeToggle } from './theme-toggle';

export const metadata: Metadata = {
    title: 'Account',
};

/**
 * Derives up-to-two uppercase initials from a name/email for the avatar fallback.
 *
 * @param source - The name or email to derive from.
 * @returns The initials.
 */
function initialsOf(source: string): string {
    return source
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

/**
 * Formats an epoch-ms timestamp as a human date (UTC, locale-stable).
 *
 * @param epochMs - The timestamp.
 * @returns The formatted date.
 */
function formatDate(epochMs: number): string {
    return new Date(epochMs).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * A label/value row for the read-only account-info section.
 *
 * @param props.label - The field label.
 * @param props.children - The value content.
 * @returns The row.
 */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
            <span className="font-mono text-foreground text-sm">{children}</span>
        </div>
    );
}

/**
 * Operator account settings page. Reads the caller's own account view from Convex (authorized,
 * identity-scoped) and composes the Profile, Account-info, Connected-accounts, and Preferences
 * sections. Redirects unauthenticated requests to the login route.
 *
 * @returns The account settings view.
 */
export default async function AccountPage() {
    const session = await auth();
    if (!session?.user?.email) {
        redirect('/auth/login/' as Route);
    }

    const account = await getOwnAccount();
    const avatar = gravatarUrl(account.email);

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2">
            <header className="flex flex-col gap-1">
                <h1 className="font-black text-2xl uppercase tracking-tight">Account</h1>
                <p className="text-muted-foreground text-sm">Manage your operator profile and preferences.</p>
            </header>

            <SettingsSection title="Profile" description="Your display name and avatar.">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className="size-20 border-2 border-border">
                            <AvatarImage src={avatar} alt={account.name} />
                            <AvatarFallback>{initialsOf(account.name || account.email)}</AvatarFallback>
                        </Avatar>
                        <p className="max-w-[12rem] text-center text-muted-foreground text-xs">
                            Avatar comes from{' '}
                            <a
                                href="https://gravatar.com"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 font-semibold text-foreground underline"
                            >
                                Gravatar
                                <ExternalLink className="h-3 w-3" />
                            </a>
                            . Change it there.
                        </p>
                    </div>
                    <div className="flex-1">
                        <ProfileForm initialName={account.name} />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Account" description="Read-only account details.">
                <div className="flex flex-col divide-y divide-border">
                    <InfoRow label="Email">{account.email}</InfoRow>
                    <InfoRow label="Member since">{formatDate(account.createdAt)}</InfoRow>
                    <InfoRow label="Email verified">{account.emailVerified ? 'Yes' : 'No'}</InfoRow>
                </div>
            </SettingsSection>

            <SettingsSection title="Connected accounts" description="Sign-in providers linked to your account.">
                {account.identities.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No connected accounts.</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {account.identities.map((identity) => (
                            <li
                                key={`${identity.provider}:${identity.identity}`}
                                className="flex items-center justify-between gap-4 rounded-md border-2 border-border px-4 py-3"
                            >
                                <span className="flex items-center gap-2 font-semibold text-sm capitalize">
                                    <Github className="h-4 w-4" />
                                    {identity.provider}
                                </span>
                                <span className="font-mono text-muted-foreground text-xs">
                                    Linked {formatDate(identity.createdAt)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </SettingsSection>

            <SettingsSection
                title="Preferences"
                description="Theme follows your system by default. Light mode is coming soon."
            >
                <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-sm">Theme</span>
                    <ThemeToggle initialTheme={account.theme} />
                </div>
            </SettingsSection>
        </div>
    );
}
```

> If `lucide-react` does not export `Github` in the installed version, use `Github` from the account-menu's existing icon set or substitute a generic `KeyRound`/`Link2` icon — match whatever `lucide-react` exports (the test only asserts the provider text, not the icon).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test "apps/admin/src/app/(app)/(user)/accounts/account-page.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck the whole admin app**

Run: `pnpm --filter @nordcom/commerce-admin typecheck`
Then: `pnpm lint`
Expected: PASS (fix any unused-import/var or diagnostics surfaced).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/account-convex.ts apps/admin/src/components/settings "apps/admin/src/app/(app)/(user)/accounts"
git commit -m "feat(admin): build the operator account settings page."
```

---

# Phase 5 — End-to-end coverage

### Task 5.1: Playwright e2e for the account page

**Files:**
- Create: `apps/admin/e2e/account-settings.spec.ts`

> The admin e2e harness (`global-setup.ts`) seeds operator `e2e-test@example.com` (display name `E2E Test User`) and writes a NextAuth session cookie, so the page loads pre-authenticated. `/accounts/` is domain-agnostic.

- [ ] **Step 1: Write the e2e spec**

```ts
import { expect, test } from '@playwright/test';

test.describe('Account settings', () => {
    test('renders the account sections for the signed-in operator', async ({ page }) => {
        await page.goto('/accounts/');
        await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
        // Account-info shows the seeded operator email.
        await expect(page.getByText('e2e-test@example.com')).toBeVisible();
        // Connected accounts + preferences are present.
        await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();
    });

    test('saves a display-name change', async ({ page }) => {
        await page.goto('/accounts/');
        const field = page.getByLabel('Display name');
        await field.fill('E2E Renamed Operator');
        await page.getByRole('button', { name: 'Save' }).click();
        // The success toast confirms the round-trip through the Convex seam.
        await expect(page.getByText('Profile updated.')).toBeVisible();
        // Restore the seed name so the spec is idempotent across runs.
        await field.fill('E2E Test User');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Profile updated.')).toBeVisible();
    });

    test('switches the theme preference to Dark', async ({ page }) => {
        await page.goto('/accounts/');
        await page.getByRole('radio', { name: 'Dark' }).click();
        await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        // Restore default for idempotency.
        await page.getByRole('radio', { name: 'System' }).click();
    });
});
```

- [ ] **Step 2: Run the e2e suite** (requires a seeded local Convex backend + the admin dev/start server, per the repo's e2e setup)

Run: `pnpm --filter @nordcom/commerce-admin test:e2e account-settings`
Expected: the three account-settings tests PASS. If the local Convex backend / env (`CONVEX_URL`, `CONVEX_SERVER_SECRET`, `NEXTAUTH_SECRET`, `CONVEX_AUTH_PRIVATE_KEY`) is not running locally, this is the gate CI runs; verify locally if the backend is up, otherwise rely on CI and note it in the commit.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/e2e/account-settings.spec.ts
git commit -m "test(admin): cover the account settings page end-to-end."
```

---

# Phase 6 — Full verification

### Task 6.1: Run the complete gate and fix anything red

- [ ] **Step 1: Build packages (fresh-checkout safety)**

Run: `pnpm build:packages`
Expected: PASS.

- [ ] **Step 2: Lint + typecheck**

Run: `pnpm lint`
Then: `pnpm typecheck`
Expected: PASS. Fix any unused imports/vars (notably the dropped `avatar_url` in `auth.config.ts`), diagnostics, or JSDoc gaps.

- [ ] **Step 3: Unit/integration tests (admin + convex) and the limit gate**

Run: `pnpm test apps/admin/src/app/\(app\)/\(user\)/accounts apps/admin/src/components/theme apps/admin/src/components/settings apps/admin/src/utils/gravatar.test.ts apps/admin/src/utils/theme.test.ts`
Then: `pnpm --filter @nordcom/commerce-convex test`
Then: `pnpm --filter @nordcom/commerce-test-convex run test src/limits`
Expected: all PASS.

- [ ] **Step 4: Verify in the running app** (per CLAUDE.md — use the `next-devtools` MCP `init` first for Next.js work)

- Start the admin dev server against the local Convex deployment (`pnpm convex:dev` + `pnpm --filter @nordcom/commerce-admin dev`), sign in, open `/accounts/`.
- Confirm: avatar shows Gravatar (or initials fallback), name edit saves with a toast and reflects in the shell account menu, theme toggle flips `data-theme` and survives a reload (cookie), Account-info + Connected-accounts render.

- [ ] **Step 5: Final commit (only if Step 2–4 required fixes)**

```bash
git add -A
git commit -m "chore(admin): finalize account settings verification fixes."
```

---

## Self-Review (completed during planning)

**Spec coverage:** Every spec decision maps to a task — surface/target (Phase 4), sections (Task 4.6), Gravatar admin-only (Phase 2), editable name + shell source-of-truth (Tasks 2.2, 4.5, 4.6), theme dark/system + storage + plumbing (Phase 3 + Tasks 4.2/4.4), authorized self-update (Phase 1), save model (Tasks 4.4/4.5), testing at every layer (convex-test, component, e2e), no changeset (verified ignore list).

**Placeholder scan:** No TBD/TODO/"add validation"-style gaps; every code step ships real code; every command has an expected result.

**Type consistency:** `AccountSelf` / `AccountIdentity` / `AccountErrorCode` are defined once in Convex (`account/self.ts`) and re-declared structurally in the admin bridge (`account-convex.ts`) with identical shapes; `ThemePreference` (`'dark' | 'system'`) is used consistently across `theme.ts`, the provider, the toggle, the actions, and the seam; `THEME_COOKIE` (`'admin-theme'`) is the single source for the cookie name (util, script, provider, action). Function names referenced across tasks (`gravatarUrl`, `parseThemePreference`, `resolveAppliedTheme`, `getOwnAccount`, `updateOwnAccount`, `saveAccountName`, `saveThemePreference`, `SettingsSection`, `ThemeProvider`, `useTheme`, `ThemeToggle`, `ProfileForm`) are consistent.

**Known verification points for the implementer** (resolve by running the steps, not by guessing):
- Exact import source of `isOperatorTokenMintingConfigured` (Task 4.1) — match `editor-convex-bridge.ts`.
- Whether Radix `AvatarImage` mounts in happy-dom (Task 2.2 Step 4) — pick the green assertion.
- `lucide-react` `Github` export availability (Task 4.6) — substitute if absent.
- The local e2e backend/env availability (Task 5.1) — otherwise rely on the CI gate.

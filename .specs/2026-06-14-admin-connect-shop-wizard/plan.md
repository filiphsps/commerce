# Admin "Connect a new Shop" Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/new` page in the admin app with a multi-step wizard that creates a new multi-tenant shop (basics → connect commerce provider → optional branding → review) and writes it atomically through the Convex-backed `Shop.create` seam.

**Architecture:** A `'use client'` stepped wizard renders provider-agnostic steps. The commerce-provider connect step is driven by a thin registry (Shopify is the only entry today; new systems slot in by adding a registry + mapper entry, no wizard edits). Server actions back it: `checkDomainAvailability` + `createShop` (route-scoped) and `testShopifyConnection` (a provider-scoped action co-located with the Shopify connector). `createShop` is one `Shop.create` call → one atomic `db/shop_write:upsertShop` transaction that writes the shop row, shreds the secret token into `shopCredentials`, reconciles `shopDomains` routing, and adds the creator as an `['admin']` collaborator. The creator can immediately enter `/[domain]` because the dashboard gate (`getAuthedCmsCtx`) admits collaborators.

> **Review-hardened.** This plan was adversarially reviewed against the live codebase; fixes are baked in. Watch especially: (a) admin tsconfig has **no `@/app/*` path alias** — the connect form reaches its test action via a **relative** `./actions`, never `@/app/...`; (b) the secret private Storefront token is **required** before the connect step can advance and is re-checked in `createShop`; (c) per-task test runs use a **positional filter** (no inner `--`), else vitest runs the whole admin suite.

**Tech Stack:** Next.js 16 (App Router, RSC + `'use client'`), `@nordcom/nordstar` UI primitives (`Button`, `Card`, `Heading`, `Input`, `Label`, `Details`), `@nordcom/commerce-db` (`Shop` service), `@nordcom/commerce-errors` (`Error.isNotFound`), NextAuth (`auth()`), Vitest + React Testing (hoisted-mock pattern).

---

## Resolved design decisions (from grilling)

These are locked. Do not re-litigate them while implementing.

1. **Connect mechanism:** Support both OAuth and manual, but THIS plan ships only the **manual paste + live validation** path. The Shopify connect form renders a method toggle whose **OAuth option is present but disabled ("coming soon")** — the OAuth-ready seam. OAuth callback + Admin-API storefront-token creation are a **follow-up plan**, out of scope here.
2. **Architecture:** Bespoke multi-step client wizard + a bespoke `createShop` server action calling `Shop.create`. NOT the CMS `EditorNewPage` pattern.
3. **Provider abstraction:** Thin registry. A UI registry (`COMMERCE_PROVIDERS`) maps provider id → `{ label, ConnectForm }`; a server-safe mapper registry (`PROVIDER_MAPPERS`) maps id → `toCommerceProvider`. Shopify is the only entry. The split keeps client components out of the server-action bundle.
4. **Branding step:** Optional / skippable. Collects **accent colors only** (primary + secondary). The header **logo is always defaulted** to an empty-`src` asset — the storefront header/footer guard on `logo.src` and render nothing for an empty string (`apps/storefront/src/components/header/header.tsx:60`), so no broken image and no placeholder file is needed. Operators upload a real logo post-creation in settings/media (the media pipeline is tenant-scoped and unavailable pre-creation — this is WHY the logo is deferred).
5. **Access control:** Any authenticated user may open `/new` and create a shop; on create they become the shop's `['admin']` collaborator. No new global-role concept.
6. **Domain:** Operator types the full customer-facing hostname. Format-validated + live availability-checked against `Shop.findByDomain`. DNS is the operator's responsibility — the review step shows a "point your DNS at `SERVICE_DOMAIN`" note. No subdomain provisioning.
7. **Post-create:** `revalidatePath('/')` then `redirect('/<domain>/')` (trailing slash).

## Key codebase facts (verified)

- **Write seam:** `import { Shop } from '@nordcom/commerce-db'`. `Shop.create(input: Omit<ShopBase, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShopBase>`. `Shop.create` internally calls `splitCommerceProvider`, which moves `commerceProvider.authentication.token` (and `customers.clientSecret`) into the split-out credentials bag — so the action passes the secret token ON the `commerceProvider` and the seam shreds it. Required fields for an insert: `name`, `domain`, `design`, `commerceProvider`. `collaborators` is required by `ShopBase` (pass the creator).
- **Load-bearing Shopify fields** (`apps/storefront/src/api/shopify.ts:51-56`, `providers-registry.tsx:51-54`): `commerceProvider.authentication.publicToken`, `commerceProvider.authentication.token` (secret), `commerceProvider.domain` (`*.myshopify.com`). `storefrontId` feeds Shopify analytics (`trackable.tsx` uses `storefrontId || commerce.id`). `id` and `storefrontId` are required non-empty strings; default both to the store domain when not supplied.
- **`design` shape:** `{ header: { logo: { width, height, src, alt } }, accents: AccentToken[] }`. `AccentToken = { type: 'primary' | 'secondary'; color: string; foreground: string }`. `THEME_DEFAULTS.colors.accents` is `[]`, so an empty `accents` array renders the platform theme byte-identically.
- **Collaborator permission convention:** full access is `permissions: ['admin']` (used everywhere in tests + `getAuthedCmsCtx`'s `hasAdminPermission`).
- **Availability check:** `Shop.findByDomain(domain)` resolves an `OnlineShop` when claimed and **throws `UnknownShopDomainError` when free**. `import { Error } from '@nordcom/commerce-errors'; Error.isNotFound(err)` returns `true` for it (same pattern as `[domain]/layout.tsx:47`).
- **Auth in server actions:** `import { auth } from '@/auth'`; `const session = await auth(); session?.user?.id`. The id is set in the JWT callback (`apps/admin/src/utils/auth.ts:45`).
- **nordstar exports available:** `Accented, Button, Card, Details, Header, Heading, Input, Label, NordstarProvider, View`. **No `Select`/`Form`** — use a native `<select>`/`<input type="color">` where needed.
- **The bare-`Error` constructor is hook-blocked.** A `block-new-error` hook (`.claude/hookify.block-new-error.local.md`, pattern `new\s+Error\s*\(`) blocks any file write that constructs a bare `Error` — TEST files included. Production code throws `@nordcom/commerce-errors` classes (already the convention). Test mocks needing a throwable sentinel use a built-in `Error` subclass instead — this plan uses `new RangeError(...)` (still `instanceof Error`, so `error.message` and `expect(...).toThrow('msg')` hold). Never construct a bare `Error` anywhere, tests included.
- **Component tests render via `@/utils/test/react`, NOT `@testing-library/react`** (verified during execution). The admin uses happy-dom with a global-registrator setup (`vitest.setup.ts`); `@/utils/test/react` re-exports Testing Library and overrides `render`/`screen` to bind to the registered `document.body`. Importing those straight from `@testing-library/react` mounts nothing (empty `<body />`) and every query fails. Canonical example: `apps/admin/src/utils/test/react.test.tsx`.
- **Dynamic `redirect(...)` needs `as Route`** (verified). Admin has Next typed routes on, so `redirect(`/${x}/`)` isn't assignable to the typed-route union — cast `as Route` (`import type { Route } from 'next'`), the repo's existing convention for dynamic-domain redirects.
- **Changeset:** `apps/admin` is `@nordcom/commerce-admin`, matched by the `@nordcom/*` ignore entry in `.changeset/config.json`. **No changeset required.**
- **Commands:** `pnpm test --project @nordcom/commerce-admin` (Vitest), `pnpm typecheck` (tsc), `pnpm lint` (Biome). Call `mcp__next-devtools__init` before Next.js work. In a fresh checkout run `pnpm build:packages` first.

## File structure

Created files (all under `apps/admin/src`):

```
lib/new-shop/
  defaults.ts            SHOPIFY_STOREFRONT_API_VERSION, DEFAULT_SHOP_LOCALE, DEFAULT_SHOP_LOGO, DEFAULT_SHOP_ACCENTS
  validation.ts          normalizeHostname, isValidHostname, isValidLocale, readableForeground
  validation.test.ts
  types.ts               WizardDraft, CreateShopInput, CreateShopResult
lib/commerce-providers/
  types.ts               ProviderUiEntry, ProviderMapper, ConnectFormProps
  mappers.ts             PROVIDER_MAPPERS (server-safe; no client imports)
  mappers.test.ts
  registry.tsx           COMMERCE_PROVIDERS (UI), PROVIDER_ORDER
  registry.test.tsx
  shopify/
    ping.ts              pingShopifyStorefront (server-only Storefront-API ping)
    ping.test.ts
    actions.ts           'use server' testShopifyConnection (provider-scoped; wraps ping)
    mapper.ts            shopifyToCommerceProvider, ShopifyConnectValues
    connect-form.tsx     'use client' ShopifyConnectForm (method toggle + manual fields + Test connection)
    connect-form.test.tsx
app/(app)/(setup)/new/
  actions.ts             'use server' checkDomainAvailability, createShop
  actions.test.ts
  wizard.tsx             'use client' NewShopWizard
  wizard.test.tsx
  page.tsx               (MODIFY) server page → reads SERVICE_DOMAIN, renders <NewShopWizard serviceDomain=… />
  page.test.tsx
```

> **Import-path rule (verified):** admin `tsconfig.json` defines only specific `@/…` prefixes (`@/auth`, `@/lib/*`, `@/components/*`, `@/utils/*`, `@/api/*`, `@/hooks/*`) — **no `@/app/*` and no `@/*` catch-all**. Files under `lib/**` importing route-level code MUST use a relative path. Here the connect form imports its test action from the sibling `./actions` (provider-scoped), so no route import is needed at all. Route files (`new/*`) reach `lib/**` via the existing `@/lib/*` alias as usual.

---

## Task 1: Wizard defaults + validation helpers

**Files:**
- Create: `apps/admin/src/lib/new-shop/defaults.ts`
- Create: `apps/admin/src/lib/new-shop/validation.ts`
- Test: `apps/admin/src/lib/new-shop/validation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/new-shop/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { isValidHostname, isValidLocale, normalizeHostname, readableForeground } from './validation';

describe('normalizeHostname', () => {
    it('strips scheme, path, port, and lowercases', () => {
        expect(normalizeHostname('  HTTPS://Shop.Acme.com:443/path  ')).toBe('shop.acme.com');
    });
});

describe('isValidHostname', () => {
    it('accepts a dotted hostname', () => {
        expect(isValidHostname('shop.acme.com')).toBe(true);
        expect(isValidHostname('acme.myshopify.com')).toBe(true);
    });
    it('rejects single labels, schemes, and empty input', () => {
        expect(isValidHostname('localhost')).toBe(false);
        expect(isValidHostname('https://acme.com')).toBe(true); // normalized first
        expect(isValidHostname('')).toBe(false);
        expect(isValidHostname('-acme.com')).toBe(false);
    });
});

describe('isValidLocale', () => {
    it('accepts language-REGION and rejects junk', () => {
        expect(isValidLocale('en-US')).toBe(true);
        expect(isValidLocale('sv-SE')).toBe(true);
        expect(isValidLocale('english')).toBe(false);
        expect(isValidLocale('en_us')).toBe(false);
    });
});

describe('readableForeground', () => {
    it('returns dark text on light backgrounds and light text on dark', () => {
        expect(readableForeground('#ffffff')).toBe('#000000');
        expect(readableForeground('#000000')).toBe('#ffffff');
        expect(readableForeground('#fff')).toBe('#000000');
    });
    it('falls back to white for unparseable input', () => {
        expect(readableForeground('not-a-color')).toBe('#ffffff');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/new-shop/validation.test.ts`
Expected: FAIL — `Cannot find module './validation'`.

- [ ] **Step 3: Write `defaults.ts`**

Create `apps/admin/src/lib/new-shop/defaults.ts`:

```ts
import type { AccentToken } from '@nordcom/commerce-db';

/**
 * Storefront API version pinned for connection-validation pings. Mirrors the Admin API version
 * (`ApiVersion.October25`) the Shopify OAuth integration already targets, so both halves of the
 * eventual "support both" surface speak the same Shopify version.
 */
export const SHOPIFY_STOREFRONT_API_VERSION = '2025-10';

/**
 * Locale prefilled in the wizard's Basics step. Anchors the shop-default arm of the
 * `request locale → shop default → platform default` fallback when the operator does not change it.
 */
export const DEFAULT_SHOP_LOCALE = 'en-US';

/**
 * Header logo written for every new shop. `src` is intentionally empty: the storefront header and
 * footer guard on `logo.src` (`apps/storefront/src/components/header/header.tsx:60`) and render
 * nothing for an empty string, so no broken image appears and the shop name stands in. Non-zero
 * dimensions keep the header's `aspect-ratio: width / height` CSS finite. Operators replace this in
 * settings/media after creation — the media pipeline is tenant-scoped and unavailable before the
 * shop (and its tenant) exist.
 */
export const DEFAULT_SHOP_LOGO = { width: 125, height: 50, src: '', alt: '' } as const;

/**
 * Accent set written when the operator skips branding. `THEME_DEFAULTS.colors.accents` is `[]`, so an
 * empty set resolves to the platform theme byte-identically (no migration, no surprise colors).
 */
export const DEFAULT_SHOP_ACCENTS: AccentToken[] = [];
```

- [ ] **Step 4: Write `validation.ts`**

Create `apps/admin/src/lib/new-shop/validation.ts`:

```ts
/** Language-REGION locale shape, e.g. `en-US`. */
const LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;

/** Dot-separated hostname labels (letters/digits/hyphen, no leading/trailing hyphen), ≥2 labels. */
const HOSTNAME_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

/**
 * Reduces operator input to a bare hostname: trims, lowercases, and strips any scheme, path, and
 * port so `https://Shop.Acme.com:443/x` and `shop.acme.com` normalize to one routable key — the same
 * form stored on `shop.domain` and indexed in `shopDomains`.
 *
 * @param input - Raw hostname/URL text from the form.
 * @returns The normalized bare hostname.
 */
export function normalizeHostname(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '');
}

/**
 * Whether the (normalized) input is a routable multi-label hostname — no scheme, port, or path, and
 * at least one dot. Single labels like `localhost` are rejected because tenant routing keys on a real
 * public hostname.
 *
 * @param input - Raw hostname/URL text.
 * @returns `true` when the normalized value is a valid hostname.
 */
export function isValidHostname(input: string): boolean {
    return HOSTNAME_PATTERN.test(normalizeHostname(input));
}

/**
 * Whether the input matches the `xx-XX` language-REGION locale shape stored on `shop.i18n.defaultLocale`.
 *
 * @param input - Raw locale text.
 * @returns `true` when the trimmed value is a valid locale tag.
 */
export function isValidLocale(input: string): boolean {
    return LOCALE_PATTERN.test(input.trim());
}

/**
 * Picks a legible foreground (`#000000` / `#ffffff`) for a hex background by perceived luminance, so a
 * chosen accent always pairs with readable text in the stored `AccentToken.foreground`.
 *
 * @param hexColor - A `#rgb` or `#rrggbb` background color.
 * @returns `#000000` for light backgrounds, `#ffffff` for dark or unparseable input.
 */
export function readableForeground(hexColor: string): string {
    const hex = hexColor.trim().replace(/^#/, '');
    const full = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return '#ffffff';
    }
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/new-shop/validation.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/new-shop/defaults.ts apps/admin/src/lib/new-shop/validation.ts apps/admin/src/lib/new-shop/validation.test.ts
git commit -m "feat(admin): add new-shop wizard defaults and input validation helpers."
```

---

## Task 2: Shopify Storefront-API ping + test server action

**Files:**
- Create: `apps/admin/src/lib/commerce-providers/shopify/ping.ts`
- Test: `apps/admin/src/lib/commerce-providers/shopify/ping.test.ts`
- Create: `apps/admin/src/lib/commerce-providers/shopify/actions.ts` (the `testShopifyConnection` server action the connect form imports relatively)

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/commerce-providers/shopify/ping.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pingShopifyStorefront } from './ping';

const okResponse = (body: unknown): Response =>
    ({ ok: true, status: 200, json: async () => body }) as Response;
const httpError = (status: number): Response => ({ ok: false, status, json: async () => ({}) }) as Response;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('pingShopifyStorefront', () => {
    it('returns ok + shopName when the Storefront API answers', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(okResponse({ data: { shop: { name: 'Acme' } } }));

        const result = await pingShopifyStorefront({ storeDomain: 'acme.myshopify.com', publicToken: 'tok' });

        expect(result).toEqual({ ok: true, shopName: 'Acme' });
        const [url, init] = fetchSpy.mock.calls[0]!;
        expect(url).toBe('https://acme.myshopify.com/api/2025-10/graphql.json');
        expect((init!.headers as Record<string, string>)['X-Shopify-Storefront-Access-Token']).toBe('tok');
    });

    it('reports GraphQL errors', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ errors: [{ message: 'bad token' }] }));
        const result = await pingShopifyStorefront({ storeDomain: 'acme.myshopify.com', publicToken: 'x' });
        expect(result).toEqual({ ok: false, error: 'bad token' });
    });

    it('reports an HTTP failure', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(httpError(401));
        const result = await pingShopifyStorefront({ storeDomain: 'acme.myshopify.com', publicToken: 'x' });
        expect(result).toEqual({ ok: false, error: 'Shopify Storefront API returned HTTP 401.' });
    });

    it('rejects empty inputs without calling fetch', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const result = await pingShopifyStorefront({ storeDomain: '', publicToken: '' });
        expect(result.ok).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/shopify/ping.test.ts`
Expected: FAIL — `Cannot find module './ping'`.

- [ ] **Step 3: Write `ping.ts`**

Create `apps/admin/src/lib/commerce-providers/shopify/ping.ts`:

```ts
import 'server-only';

import { SHOPIFY_STOREFRONT_API_VERSION } from '@/lib/new-shop/defaults';
import { normalizeHostname } from '@/lib/new-shop/validation';

/** Result of probing a Shopify storefront with a public token. */
export type ShopifyPingResult = { ok: true; shopName: string } | { ok: false; error: string };

/**
 * Validates a Shopify Storefront API connection by issuing a minimal `{ shop { name } }` query with
 * the supplied public token. Runs server-side (the request carries a token and would be blocked by
 * CORS from the browser). Confirms the public-token half of the connection the storefront renders
 * with; the private token is stored but not independently pinged here.
 *
 * @param args.storeDomain - The `*.myshopify.com` store domain (any scheme/path is normalized off).
 * @param args.publicToken - The Storefront API public access token.
 * @returns `{ ok: true, shopName }` on success, otherwise `{ ok: false, error }` with a human message.
 */
export async function pingShopifyStorefront(args: {
    storeDomain: string;
    publicToken: string;
}): Promise<ShopifyPingResult> {
    const storeDomain = normalizeHostname(args.storeDomain);
    const publicToken = args.publicToken.trim();
    if (!storeDomain || !publicToken) {
        return { ok: false, error: 'Store domain and public token are both required.' };
    }

    const endpoint = `https://${storeDomain}/api/${SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`;
    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': publicToken,
            },
            body: JSON.stringify({ query: '{ shop { name } }' }),
        });
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Network error reaching Shopify.' };
    }

    if (!response.ok) {
        return { ok: false, error: `Shopify Storefront API returned HTTP ${response.status}.` };
    }

    const json = (await response.json()) as {
        data?: { shop?: { name?: string } };
        errors?: { message?: string }[];
    };
    if (json.errors?.length) {
        return { ok: false, error: json.errors[0]?.message ?? 'Shopify Storefront API error.' };
    }
    const name = json.data?.shop?.name;
    if (!name) {
        return { ok: false, error: 'Connected, but no shop was returned — check the token and its scope.' };
    }
    return { ok: true, shopName: name };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/shopify/ping.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `actions.ts` (the provider-scoped test action)**

The connect form (Task 5) needs a server action it can call from the browser. It lives beside the Shopify connector so the form imports it relatively (`./actions`) — the admin tsconfig has no `@/app/*` alias, and co-locating keeps provider code self-contained.

Create `apps/admin/src/lib/commerce-providers/shopify/actions.ts`:

```ts
'use server';

import 'server-only';

import { pingShopifyStorefront, type ShopifyPingResult } from './ping';

/**
 * Server action wrapping {@link pingShopifyStorefront} so the `'use client'` Shopify connect form can
 * validate a connection from the browser (the ping carries a token and must run server-side). Thin by
 * design — the verdict logic lives in the ping helper.
 *
 * @param args.storeDomain - The `*.myshopify.com` store domain.
 * @param args.publicToken - The Storefront API public access token.
 * @returns The ping verdict (`{ ok, shopName }` or `{ ok, error }`).
 */
export async function testShopifyConnection(args: {
    storeDomain: string;
    publicToken: string;
}): Promise<ShopifyPingResult> {
    return pingShopifyStorefront(args);
}
```

> No separate unit test: this is a one-line delegation with no branching (the ping is fully covered above), and it is exercised end-to-end by the connect-form test (Task 5) which mocks `./actions`. Adding a test that only asserts "calls the mock" would test the mock, not the code.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/commerce-providers/shopify/ping.ts apps/admin/src/lib/commerce-providers/shopify/ping.test.ts apps/admin/src/lib/commerce-providers/shopify/actions.ts
git commit -m "feat(admin): add Shopify Storefront API ping and connection-test action."
```

---

## Task 3: Shopify provider mapper + mapper registry

**Files:**
- Create: `apps/admin/src/lib/commerce-providers/shopify/mapper.ts`
- Create: `apps/admin/src/lib/commerce-providers/types.ts`
- Create: `apps/admin/src/lib/commerce-providers/mappers.ts`
- Test: `apps/admin/src/lib/commerce-providers/mappers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/commerce-providers/mappers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { PROVIDER_MAPPERS } from './mappers';

describe('PROVIDER_MAPPERS.shopify', () => {
    it('builds a shopify commerceProvider with the secret token attached', () => {
        const provider = PROVIDER_MAPPERS.shopify({
            storeDomain: 'https://Acme.myshopify.com/',
            publicToken: ' pub ',
            privateToken: ' shpat_secret ',
        });

        expect(provider).toEqual({
            type: 'shopify',
            authentication: {
                token: 'shpat_secret',
                publicToken: 'pub',
                domain: 'acme.myshopify.com',
            },
            storefrontId: 'acme.myshopify.com',
            domain: 'acme.myshopify.com',
            id: 'acme.myshopify.com',
        });
    });

    it('uses an explicit storefrontId when provided', () => {
        const provider = PROVIDER_MAPPERS.shopify({
            storeDomain: 'acme.myshopify.com',
            publicToken: 'pub',
            privateToken: 'sec',
            storefrontId: 'gid://shopify/Shop/42',
        });
        expect(provider.type === 'shopify' && provider.storefrontId).toBe('gid://shopify/Shop/42');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/mappers.test.ts`
Expected: FAIL — `Cannot find module './mappers'`.

- [ ] **Step 3: Write `shopify/mapper.ts`**

Create `apps/admin/src/lib/commerce-providers/shopify/mapper.ts`:

```ts
import type { CommerceProvider } from '@nordcom/commerce-db';

import { normalizeHostname } from '@/lib/new-shop/validation';

/** Field keys the Shopify manual connect form collects. `storefrontId` is the optional advanced field. */
export type ShopifyConnectValues = {
    storeDomain: string;
    publicToken: string;
    privateToken: string;
    storefrontId?: string;
};

/**
 * Maps the manual Shopify connect values into the stored `commerceProvider` shape. The secret private
 * token is placed on `authentication.token`; `Shop.create` (`splitCommerceProvider`) shreds it into the
 * split-out `shopCredentials` table, so the public shop row never carries it. `storefrontId` and `id`
 * are required non-empty strings — both default to the store domain when no explicit storefront id is
 * given (the storefront's analytics path reads `storefrontId || id`, so a stable domain string is a
 * safe fallback the operator can refine later).
 *
 * @param values - The collected connect-form values (loosely typed; missing keys default to empty).
 * @returns The Shopify `commerceProvider`, secret token included.
 */
export function shopifyToCommerceProvider(values: Record<string, string>): CommerceProvider {
    const storeDomain = normalizeHostname(values.storeDomain ?? '');
    const storefrontId = (values.storefrontId ?? '').trim() || storeDomain;
    return {
        type: 'shopify',
        authentication: {
            token: (values.privateToken ?? '').trim(),
            publicToken: (values.publicToken ?? '').trim(),
            domain: storeDomain,
        },
        storefrontId,
        domain: storeDomain,
        id: storeDomain,
    };
}
```

- [ ] **Step 4: Write `types.ts`**

Create `apps/admin/src/lib/commerce-providers/types.ts`:

```ts
import type { CommerceProvider, CommerceProviders } from '@nordcom/commerce-db';
import type { ComponentType } from 'react';

/**
 * Props every provider connect-step component receives from the wizard: the collected values, a change
 * callback to lift them into wizard state, and a callback firing the live validation verdict so the
 * wizard can gate the Next button.
 */
export type ConnectFormProps = {
    /** Current collected values for this provider's connect step. */
    value: Record<string, string>;
    /** Lifts updated values into wizard state. */
    onChange: (value: Record<string, string>) => void;
    /** Reports whether the connection has been validated (`true`) or invalidated (`false`). */
    onTestResult: (ok: boolean) => void;
};

/** UI-side registry entry: how a provider presents itself and collects its connection. */
export type ProviderUiEntry = {
    id: CommerceProviders;
    label: string;
    ConnectForm: ComponentType<ConnectFormProps>;
};

/** Server-side mapper: turns a provider's collected values into the stored `commerceProvider`. */
export type ProviderMapper = (values: Record<string, string>) => CommerceProvider;
```

- [ ] **Step 5: Write `mappers.ts`**

Create `apps/admin/src/lib/commerce-providers/mappers.ts`:

```ts
import type { CommerceProviders } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import { shopifyToCommerceProvider } from './shopify/mapper';
import type { ProviderMapper } from './types';

/**
 * Server-safe registry mapping a commerce-provider id to its `commerceProvider` builder. Deliberately
 * imports NO client components, so `createShop` can resolve a mapper without pulling the wizard's
 * `'use client'` connect forms into the server-action bundle. Adding a provider = one entry here plus
 * one in `COMMERCE_PROVIDERS` (the UI registry).
 */
export const PROVIDER_MAPPERS: Record<CommerceProviders, ProviderMapper> = {
    shopify: shopifyToCommerceProvider,
    // `stripe`'s schema arm carries no auth fields yet; it gains a mapper when that integration
    // matures. The wizard never offers it (PROVIDER_ORDER is shopify-only), so this is unreachable —
    // it throws a typed error (CLAUDE.md: never `new Error`) only as a defensive backstop.
    stripe: () => {
        throw new UnknownCommerceProviderError('stripe');
    },
};
```

> `UnknownCommerceProviderError` is exported from `@nordcom/commerce-errors` (`packages/errors/src/index.ts:257`) and is the same class the storefront throws for an unsupported provider. Confirm its constructor arg shape when implementing (it takes the provider type string); if the signature differs, adapt the call rather than reverting to `new Error`.

> Note: `CommerceProviders` is the union `'shopify' | 'stripe'`. `Record<CommerceProviders, ...>` forces both keys to exist; the `stripe` entry throws until implemented (it is never reachable from the wizard, which only offers Shopify — see Task 6).

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/mappers.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/lib/commerce-providers/types.ts apps/admin/src/lib/commerce-providers/mappers.ts apps/admin/src/lib/commerce-providers/shopify/mapper.ts apps/admin/src/lib/commerce-providers/mappers.test.ts
git commit -m "feat(admin): add commerce-provider mapper registry with Shopify mapper."
```

---

## Task 4: Route server actions (`checkDomainAvailability`, `createShop`)

> `testShopifyConnection` is NOT here — it is the provider-scoped action created in Task 2 (`lib/commerce-providers/shopify/actions.ts`). The connect form imports it relatively as `./actions`, avoiding the missing `@/app/*` alias and keeping provider code self-contained.

**Files:**
- Create: `apps/admin/src/lib/new-shop/types.ts`
- Create: `apps/admin/src/app/(app)/(setup)/new/actions.ts`
- Test: `apps/admin/src/app/(app)/(setup)/new/actions.test.ts`

- [ ] **Step 1: Write `types.ts`**

Create `apps/admin/src/lib/new-shop/types.ts`:

```ts
import type { CommerceProviders } from '@nordcom/commerce-db';

/** The full payload the wizard submits to `createShop`. */
export type CreateShopInput = {
    name: string;
    domain: string;
    locale: string;
    provider: { type: CommerceProviders; values: Record<string, string> };
    /** Chosen accent colors, or `null` when the branding step was skipped. */
    branding: { primaryColor: string; secondaryColor: string } | null;
};

/**
 * `createShop` resolves to a failure object only — success redirects to the new shop's dashboard and the
 * promise never settles normally on that path.
 */
export type CreateShopResult = { ok: false; error: string };
```

- [ ] **Step 2: Write the failing test**

Create `apps/admin/src/app/(app)/(setup)/new/actions.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuth, mockCreate, mockFindByDomain, mockRedirect, mockRevalidatePath, mockIsNotFound } = vi.hoisted(
    () => ({
        mockAuth: vi.fn(),
        mockCreate: vi.fn(),
        mockFindByDomain: vi.fn(),
        mockRedirect: vi.fn((url: string): never => {
            throw new RangeError(`NEXT_REDIRECT:${url}`);
        }),
        mockRevalidatePath: vi.fn(),
        mockIsNotFound: vi.fn(),
    }),
);

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('@nordcom/commerce-db', () => ({
    Shop: { create: mockCreate, findByDomain: mockFindByDomain },
}));
vi.mock('@nordcom/commerce-errors', () => ({ Error: { isNotFound: mockIsNotFound } }));

import { checkDomainAvailability, createShop } from './actions';

beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
});
afterEach(() => {
    vi.clearAllMocks();
});

describe('checkDomainAvailability', () => {
    it('is available when findByDomain throws a not-found error', async () => {
        mockFindByDomain.mockRejectedValue(new RangeError('unknown'));
        mockIsNotFound.mockReturnValue(true);
        await expect(checkDomainAvailability('shop.acme.com')).resolves.toEqual({ available: true });
    });
    it('is taken when findByDomain resolves a shop', async () => {
        mockFindByDomain.mockResolvedValue({ domain: 'shop.acme.com' });
        await expect(checkDomainAvailability('shop.acme.com')).resolves.toEqual({ available: false });
    });
    it('is unavailable for an invalid hostname without hitting the seam', async () => {
        await expect(checkDomainAvailability('localhost')).resolves.toEqual({ available: false });
        expect(mockFindByDomain).not.toHaveBeenCalled();
    });
});

describe('createShop', () => {
    const baseInput = {
        name: '  Acme  ',
        domain: 'https://shop.acme.com/',
        locale: 'en-US',
        provider: {
            type: 'shopify' as const,
            values: { storeDomain: 'acme.myshopify.com', publicToken: 'pub', privateToken: 'sec' },
        },
        branding: null,
    };

    it('creates a shop with the creator as an admin collaborator and redirects', async () => {
        mockCreate.mockResolvedValue({ domain: 'shop.acme.com' });
        await expect(createShop(baseInput)).rejects.toThrow('NEXT_REDIRECT:/shop.acme.com/');

        const arg = mockCreate.mock.calls[0]![0];
        expect(arg.name).toBe('Acme');
        expect(arg.domain).toBe('shop.acme.com');
        expect(arg.i18n).toEqual({ defaultLocale: 'en-US' });
        expect(arg.collaborators).toEqual([{ user: 'user-1', permissions: ['admin'] }]);
        expect(arg.design.accents).toEqual([]);
        expect(arg.design.header.logo).toEqual({ width: 125, height: 50, src: '', alt: 'Acme logo' });
        expect(arg.commerceProvider.type).toBe('shopify');
        expect(arg.commerceProvider.authentication.token).toBe('sec');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/');
    });

    it('maps branding colors into accent tokens', async () => {
        mockCreate.mockResolvedValue({ domain: 'shop.acme.com' });
        await expect(
            createShop({ ...baseInput, branding: { primaryColor: '#000000', secondaryColor: '#ffffff' } }),
        ).rejects.toThrow('NEXT_REDIRECT');
        const arg = mockCreate.mock.calls[0]![0];
        expect(arg.design.accents).toEqual([
            { type: 'primary', color: '#000000', foreground: '#ffffff' },
            { type: 'secondary', color: '#ffffff', foreground: '#000000' },
        ]);
    });

    it('returns an error result when the seam throws', async () => {
        mockCreate.mockRejectedValue(new RangeError('domain already claimed'));
        await expect(createShop(baseInput)).resolves.toEqual({ ok: false, error: 'domain already claimed' });
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('refuses when no session user is present', async () => {
        mockAuth.mockResolvedValue(null);
        await expect(createShop(baseInput)).resolves.toEqual({
            ok: false,
            error: 'You must be signed in to create a shop.',
        });
    });

    it('refuses a Shopify connection with an empty private token (defense in depth)', async () => {
        const result = await createShop({
            ...baseInput,
            provider: {
                type: 'shopify' as const,
                values: { storeDomain: 'acme.myshopify.com', publicToken: 'pub', privateToken: '' },
            },
        });
        expect(result).toEqual({ ok: false, error: 'A private Storefront access token is required.' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('refuses an empty shop name (defense in depth)', async () => {
        const result = await createShop({ ...baseInput, name: '   ' });
        expect(result).toEqual({ ok: false, error: 'A shop name is required.' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('refuses an invalid domain (defense in depth)', async () => {
        const result = await createShop({ ...baseInput, domain: 'localhost' });
        expect(result).toEqual({ ok: false, error: 'Enter a valid customer-facing domain.' });
        expect(mockCreate).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin "src/app/(app)/(setup)/new/actions.test.ts"`
Expected: FAIL — `Cannot find module './actions'`.

- [ ] **Step 4: Write `actions.ts`**

Create `apps/admin/src/app/(app)/(setup)/new/actions.ts`:

```ts
'use server';

import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { PROVIDER_MAPPERS } from '@/lib/commerce-providers/mappers';
import { DEFAULT_SHOP_ACCENTS, DEFAULT_SHOP_LOCALE, DEFAULT_SHOP_LOGO } from '@/lib/new-shop/defaults';
import type { CreateShopInput, CreateShopResult } from '@/lib/new-shop/types';
import { isValidHostname, normalizeHostname, readableForeground } from '@/lib/new-shop/validation';

/**
 * Live availability check for a prospective customer-facing domain. A free domain makes
 * `Shop.findByDomain` throw a not-found error; a claimed one resolves a shop. Invalid hostnames short
 * out as unavailable without touching the seam.
 *
 * @param domain - Raw hostname text from the Basics step.
 * @returns `{ available }` — `true` only when the normalized hostname is valid and unclaimed.
 * @throws Re-throws any non-not-found error from the seam (e.g. a transport failure) so it is not
 *   silently reported as "available".
 */
export async function checkDomainAvailability(domain: string): Promise<{ available: boolean }> {
    const normalized = normalizeHostname(domain);
    if (!isValidHostname(normalized)) {
        return { available: false };
    }
    try {
        await Shop.findByDomain(normalized);
        return { available: false };
    } catch (error) {
        if (CommerceError.isNotFound(error)) {
            return { available: true };
        }
        throw error;
    }
}

/**
 * Creates a new shop from the wizard payload in one atomic `Shop.create` (→ `db/shop_write:upsertShop`)
 * transaction: the shop row, the shredded secret credentials, the `shopDomains` routing row, and the
 * creator's `['admin']` collaborator membership. On success it revalidates the shop overview and
 * redirects to the new dashboard; on a seam failure it returns the error for the review step to show.
 *
 * @param input - The collected name, domain, locale, provider connection, and optional branding.
 * @returns `{ ok: false, error }` on failure; never resolves on success (it redirects).
 */
export async function createShop(input: CreateShopInput): Promise<CreateShopResult> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return { ok: false, error: 'You must be signed in to create a shop.' };
    }

    const mapper = PROVIDER_MAPPERS[input.provider.type];
    if (!mapper) {
        return { ok: false, error: `Unsupported commerce provider: ${input.provider.type}` };
    }

    // Defense in depth: the connect step already gates on a non-empty private token, but a shop with an
    // empty secret `authentication.token` is structurally valid yet functionally broken (storefront calls
    // need it). Re-check here so a bypassed/edited client can never persist one.
    const commerceProvider = mapper(input.provider.values);
    if (commerceProvider.type === 'shopify' && !commerceProvider.authentication.token) {
        return { ok: false, error: 'A private Storefront access token is required.' };
    }

    const name = input.name.trim();
    const domain = normalizeHostname(input.domain);
    // Symmetric defense in depth (matches the token guard): the Convex insert accepts empty `name`/`domain`
    // strings, so a bypassed/edited client could otherwise persist an unroutable, nameless shop. The UI
    // already gates on these, but the server must not trust the client.
    if (!name) {
        return { ok: false, error: 'A shop name is required.' };
    }
    if (!isValidHostname(domain)) {
        return { ok: false, error: 'Enter a valid customer-facing domain.' };
    }
    const accents = input.branding
        ? [
              {
                  type: 'primary' as const,
                  color: input.branding.primaryColor,
                  foreground: readableForeground(input.branding.primaryColor),
              },
              {
                  type: 'secondary' as const,
                  color: input.branding.secondaryColor,
                  foreground: readableForeground(input.branding.secondaryColor),
              },
          ]
        : DEFAULT_SHOP_ACCENTS;

    let createdDomain: string;
    try {
        const shop = await Shop.create({
            name,
            domain,
            i18n: { defaultLocale: input.locale.trim() || DEFAULT_SHOP_LOCALE },
            design: {
                header: { logo: { ...DEFAULT_SHOP_LOGO, alt: `${name} logo` } },
                accents,
            },
            commerceProvider,
            collaborators: [{ user: userId, permissions: ['admin'] }],
        });
        createdDomain = shop.domain;
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Failed to create the shop.' };
    }

    revalidatePath('/');
    // `as Route`: admin has Next typed routes enabled, so a dynamic `/${string}/` template isn't
    // assignable to the typed-route union — the same cast the repo already uses for dynamic-domain
    // redirects (e.g. `[domain]/settings/media/new/page.tsx`). Type-only; no runtime effect.
    redirect(`/${createdDomain}/` as Route);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin "src/app/(app)/(setup)/new/actions.test.ts"`
Expected: PASS (availability, empty-private-token guard, and `createShop` cases green).

> **Known coverage gap (accepted):** `actions.test.ts` mocks `Shop.create`, so it never exercises the real Convex invariant that `session.user.id` must resolve to a `users` document — `db/shop_write.ts:158` does `ctx.db.normalizeId('users', user)` and aborts the whole transaction with `SHOP_WRITE_INVALID_COLLABORATOR` if it doesn't. The manual-verification step (Task 9) covers this end-to-end. Do NOT add a real-seam integration test in this task; if desired, file a follow-up to add one under `packages/test-convex` (`startConvex()` + `seedCanonical`) asserting a created shop is returned by `Shop.findByCollaborator`.

- [ ] **Step 6: Commit**

```bash
git add "apps/admin/src/lib/new-shop/types.ts" "apps/admin/src/app/(app)/(setup)/new/actions.ts" "apps/admin/src/app/(app)/(setup)/new/actions.test.ts"
git commit -m "feat(admin): add new-shop server actions for domain check and shop create."
```

---

## Task 5: Shopify connect form (client)

**Files:**
- Create: `apps/admin/src/lib/commerce-providers/shopify/connect-form.tsx`
- Test: `apps/admin/src/lib/commerce-providers/shopify/connect-form.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/lib/commerce-providers/shopify/connect-form.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@/utils/test/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockTest } = vi.hoisted(() => ({ mockTest: vi.fn() }));
// Relative mock — connect-form imports its action as `./actions` (no @/app/* alias exists).
vi.mock('./actions', () => ({ testShopifyConnection: mockTest }));
vi.mock('@nordcom/nordstar', () => ({
    Button: ({ children, onClick, disabled, ...p }: any) => (
        <button onClick={onClick} disabled={disabled} {...p}>
            {children}
        </button>
    ),
    Input: ({ label, value, onChange, ...p }: any) => (
        <input aria-label={label} value={value} onChange={onChange} {...p} />
    ),
    Label: ({ children }: any) => <span>{children}</span>,
    Details: ({ children }: any) => <details open>{children}</details>,
}));

import { useState } from 'react';
import { ShopifyConnectForm } from './connect-form';

afterEach(() => vi.clearAllMocks());

// The form is controlled — `value` must echo edits back, exactly as NewShopWizard drives it via
// setConnectValues. A static no-op onChange would leave inputs empty and keep the Test button disabled,
// so the harness lifts edits into local state and feeds them back as `value`.
function Harness({ onTestResult }: { onTestResult: (ok: boolean) => void }) {
    const [value, setValue] = useState<Record<string, string>>({});
    return <ShopifyConnectForm value={value} onChange={setValue} onTestResult={onTestResult} />;
}

const setup = () => {
    const onTestResult = vi.fn();
    render(<Harness onTestResult={onTestResult} />);
    return { onTestResult };
};

/** Fill the three required credential fields so the Test button enables. */
const fillCredentials = () => {
    fireEvent.change(screen.getByLabelText('Store domain'), { target: { value: 'acme.myshopify.com' } });
    fireEvent.change(screen.getByLabelText('Public access token'), { target: { value: 'pub' } });
    fireEvent.change(screen.getByLabelText('Private access token'), { target: { value: 'sec' } });
};

describe('ShopifyConnectForm', () => {
    it('keeps Test disabled until all three credential fields are filled', () => {
        setup();
        const button = () => screen.getByRole('button', { name: /test connection/i }) as HTMLButtonElement;
        expect(button().disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Store domain'), { target: { value: 'acme.myshopify.com' } });
        fireEvent.change(screen.getByLabelText('Public access token'), { target: { value: 'pub' } });
        // Still disabled — the private token (the load-bearing secret) is required too.
        expect(button().disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Private access token'), { target: { value: 'sec' } });
        expect(button().disabled).toBe(false);
    });

    it('runs the connection test and reports success', async () => {
        mockTest.mockResolvedValue({ ok: true, shopName: 'Acme' });
        const { onTestResult } = setup();
        fillCredentials();
        fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => expect(onTestResult).toHaveBeenCalledWith(true));
        expect(screen.getByText(/Acme/)).toBeTruthy();
        // The ping receives only the public half.
        expect(mockTest).toHaveBeenCalledWith({ storeDomain: 'acme.myshopify.com', publicToken: 'pub' });
    });

    it('reports a failed test', async () => {
        mockTest.mockResolvedValue({ ok: false, error: 'bad token' });
        const { onTestResult } = setup();
        fillCredentials();
        fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => expect(screen.getByText(/bad token/)).toBeTruthy());
        expect(onTestResult).toHaveBeenLastCalledWith(false);
    });

    it('invalidates a prior pass when a field changes', async () => {
        mockTest.mockResolvedValue({ ok: true, shopName: 'Acme' });
        const { onTestResult } = setup();
        fillCredentials();
        fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => expect(onTestResult).toHaveBeenCalledWith(true));
        fireEvent.change(screen.getByLabelText('Public access token'), { target: { value: 'pub2' } });
        expect(onTestResult).toHaveBeenLastCalledWith(false);
    });

    it('exposes a disabled OAuth method option', () => {
        setup();
        const oauth = screen.getByRole('button', { name: /oauth/i });
        expect((oauth as HTMLButtonElement).disabled).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/shopify/connect-form.test.tsx`
Expected: FAIL — `Cannot find module './connect-form'`.

- [ ] **Step 3: Write `connect-form.tsx`**

Create `apps/admin/src/lib/commerce-providers/shopify/connect-form.tsx`:

```tsx
'use client';

import { Button, Details, Input, Label } from '@nordcom/nordstar';
import { useCallback, useState } from 'react';

// Relative import: the admin tsconfig has no `@/app/*` alias, and the action is co-located with this
// connector (Task 2), so it resolves as a sibling.
import { testShopifyConnection } from './actions';
import type { ConnectFormProps } from '@/lib/commerce-providers/types';

/** Local outcome of the "Test connection" action. */
type TestState =
    | { status: 'idle' }
    | { status: 'testing' }
    | { status: 'ok'; shopName: string }
    | { status: 'error'; error: string };

/**
 * Shopify connect step. Renders a method toggle whose OAuth option is present but disabled (the
 * "coming soon" / OAuth-ready seam) and an active manual-credentials form. The "Test connection" button
 * fires the live Storefront-API ping; a successful test calls `onTestResult(true)` so the wizard can
 * advance. Any field edit invalidates the prior test (`onTestResult(false)`), forcing a re-test before
 * the operator can continue — connection validity always reflects the current credentials.
 *
 * @param props - {@link ConnectFormProps}: current values, change lifter, and the test-result callback.
 * @returns The Shopify connect form.
 */
export function ShopifyConnectForm({ value, onChange, onTestResult }: ConnectFormProps): React.JSX.Element {
    const [test, setTest] = useState<TestState>({ status: 'idle' });

    /**
     * Lifts a single field edit into wizard state and invalidates any prior passing test, so the
     * connection verdict always reflects the current credentials.
     *
     * @param key - The connect-value key being edited.
     * @param next - The new field value.
     */
    const update = useCallback(
        (key: string, next: string): void => {
            onChange({ ...value, [key]: next });
            setTest({ status: 'idle' });
            onTestResult(false);
        },
        [onChange, onTestResult, value],
    );

    /**
     * Fires the live Storefront-API ping for the entered store domain + public token and reports the
     * verdict via `onTestResult`. Only reachable once all three credential fields are non-empty (the
     * Test button's disabled gate), so a pass implies the private token is present too.
     *
     * @returns Resolves once the verdict is recorded.
     */
    const runTest = useCallback(async (): Promise<void> => {
        setTest({ status: 'testing' });
        const result = await testShopifyConnection({
            storeDomain: value.storeDomain ?? '',
            publicToken: value.publicToken ?? '',
        });
        if (result.ok) {
            setTest({ status: 'ok', shopName: result.shopName });
            onTestResult(true);
        } else {
            setTest({ status: 'error', error: result.error });
            onTestResult(false);
        }
    }, [onTestResult, value.publicToken, value.storeDomain]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2" role="group" aria-label="Connection method">
                <Button variant="outline" color="foreground" disabled title="OAuth install — coming soon">
                    Install via OAuth (soon)
                </Button>
                <Button variant="solid" color="primary" disabled>
                    Paste credentials
                </Button>
            </div>

            <Input
                label="Store domain"
                placeholder="acme.myshopify.com"
                value={value.storeDomain ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => update('storeDomain', event.target.value)}
            />
            <Input
                label="Public access token"
                placeholder="Storefront API public token"
                value={value.publicToken ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => update('publicToken', event.target.value)}
            />
            <Input
                label="Private access token"
                type="password"
                placeholder="Storefront API private token"
                value={value.privateToken ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => update('privateToken', event.target.value)}
            />

            <Details>
                <summary>Advanced</summary>
                <Input
                    label="Storefront ID (optional)"
                    placeholder="gid://shopify/Shop/…"
                    value={value.storefrontId ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        update('storefrontId', event.target.value)
                    }
                />
            </Details>

            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    color="foreground"
                    onClick={runTest}
                    disabled={
                        test.status === 'testing' ||
                        !value.storeDomain ||
                        !value.publicToken ||
                        !value.privateToken
                    }
                >
                    {test.status === 'testing' ? 'Testing…' : 'Test connection'}
                </Button>
                {test.status === 'ok' ? <Label as="span">Connected to {test.shopName} ✓</Label> : null}
                {test.status === 'error' ? <Label as="span">{test.error}</Label> : null}
            </div>
        </div>
    );
}
```

> If `@testing-library/react` / `@testing-library/dom` is not already a dev dependency of the admin app, check `apps/admin/package.json` and the existing `*.test.tsx` files first. `apps/admin/src/app/(app)/page.test.tsx` renders components in tests — reuse whatever it imports. If it uses a different render utility, mirror that here instead of `@testing-library/react`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/shopify/connect-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/commerce-providers/shopify/connect-form.tsx apps/admin/src/lib/commerce-providers/shopify/connect-form.test.tsx
git commit -m "feat(admin): add Shopify manual connect form with live connection test."
```

---

## Task 6: UI provider registry

**Files:**
- Create: `apps/admin/src/lib/commerce-providers/registry.tsx`
- Test: `apps/admin/src/lib/commerce-providers/registry.test.tsx`

- [ ] **Step 1: Write the failing test**

The wizard test (Task 7) mocks the registry entirely, so without this the real wiring (Shopify → the real `ShopifyConnectForm`, label, order) has zero coverage and a wrong-component/label typo would slip through.

Create `apps/admin/src/lib/commerce-providers/registry.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';

import { ShopifyConnectForm } from './shopify/connect-form';
import { COMMERCE_PROVIDERS, PROVIDER_ORDER } from './registry';

describe('commerce-provider UI registry', () => {
    it('registers Shopify with the real connect form and label', () => {
        expect(COMMERCE_PROVIDERS.shopify?.label).toBe('Shopify');
        expect(COMMERCE_PROVIDERS.shopify?.id).toBe('shopify');
        expect(COMMERCE_PROVIDERS.shopify?.ConnectForm).toBe(ShopifyConnectForm);
    });

    it('orders Shopify into the picker', () => {
        expect(PROVIDER_ORDER).toContain('shopify');
        // Every ordered id must have a registry entry (no dangling picker buttons).
        for (const id of PROVIDER_ORDER) {
            expect(COMMERCE_PROVIDERS[id]).toBeDefined();
        }
    });
});
```

> `registry.test.tsx` imports `ShopifyConnectForm`, which imports `./actions` (a `'use server'` module) and `@nordcom/nordstar`. If the test runner chokes on the server-action or nordstar import at module load, add `vi.mock('./shopify/actions', () => ({ testShopifyConnection: vi.fn() }))` and the nordstar mock from Task 5 at the top of this file. Try the plain import first; only add mocks if it fails to load.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/registry.test.tsx`
Expected: FAIL — `Cannot find module './registry'`.

- [ ] **Step 3: Write `registry.tsx`**

Create `apps/admin/src/lib/commerce-providers/registry.tsx`:

```tsx
import type { CommerceProviders } from '@nordcom/commerce-db';

import { ShopifyConnectForm } from './shopify/connect-form';
import type { ProviderUiEntry } from './types';

/**
 * UI registry mapping a commerce-provider id to how it presents and collects its connection in the
 * wizard. Shopify is the only connectable provider today; adding another = one entry here plus its
 * mapper in `PROVIDER_MAPPERS`. The connect step renders purely from this registry, so new providers
 * need no wizard edits.
 */
export const COMMERCE_PROVIDERS: Partial<Record<CommerceProviders, ProviderUiEntry>> = {
    shopify: {
        id: 'shopify',
        label: 'Shopify',
        ConnectForm: ShopifyConnectForm,
    },
};

/** Display order of connectable providers in the wizard's provider picker. */
export const PROVIDER_ORDER: CommerceProviders[] = ['shopify'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin src/lib/commerce-providers/registry.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/commerce-providers/registry.tsx apps/admin/src/lib/commerce-providers/registry.test.tsx
git commit -m "feat(admin): add commerce-provider UI registry for the connect step."
```

---

## Task 7: The multi-step wizard component

**Files:**
- Create: `apps/admin/src/app/(app)/(setup)/new/wizard.tsx`
- Test: `apps/admin/src/app/(app)/(setup)/new/wizard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/app/(app)/(setup)/new/wizard.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@/utils/test/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockCheck, mockCreate } = vi.hoisted(() => ({ mockCheck: vi.fn(), mockCreate: vi.fn() }));
// The wizard imports only these two from its route actions (the connect form owns the test action).
vi.mock('./actions', () => ({
    checkDomainAvailability: mockCheck,
    createShop: mockCreate,
}));
vi.mock('@nordcom/nordstar', () => ({
    Button: ({ children, onClick, disabled, ...p }: any) => (
        <button onClick={onClick} disabled={disabled} {...p}>
            {children}
        </button>
    ),
    Card: ({ children }: any) => <section>{children}</section>,
    Heading: ({ children }: any) => <h1>{children}</h1>,
    Input: ({ label, value, onChange, ...p }: any) => (
        <input aria-label={label} value={value} onChange={onChange} {...p} />
    ),
    Label: ({ children }: any) => <span>{children}</span>,
    Details: ({ children }: any) => <details open>{children}</details>,
}));
// Render the Shopify connect step as a stub that can flip the connection gate.
vi.mock('@/lib/commerce-providers/registry', () => ({
    PROVIDER_ORDER: ['shopify'],
    COMMERCE_PROVIDERS: {
        shopify: {
            id: 'shopify',
            label: 'Shopify',
            ConnectForm: ({ onTestResult }: any) => (
                <button type="button" onClick={() => onTestResult(true)}>
                    mark-connected
                </button>
            ),
        },
    },
}));

import { NewShopWizard } from './wizard';

afterEach(() => vi.clearAllMocks());

const fillBasicsAndAdvance = async () => {
    mockCheck.mockResolvedValue({ available: true });
    fireEvent.change(screen.getByLabelText('Shop name'), { target: { value: 'Acme' } });
    const domain = screen.getByLabelText('Customer-facing domain');
    fireEvent.change(domain, { target: { value: 'shop.acme.com' } });
    fireEvent.blur(domain);
    await waitFor(() => expect(screen.getByText(/available/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
};

describe('NewShopWizard', () => {
    it('gates Basics → Connect on a valid, available domain', async () => {
        render(<NewShopWizard />);
        // Next is disabled before a domain is checked.
        expect((screen.getByRole('button', { name: /^next$/i }) as HTMLButtonElement).disabled).toBe(true);
        await fillBasicsAndAdvance();
        // The always-rendered heading ("Connect a new Shop") and step label also contain "connect", so
        // target the Connect step's unique provider label to confirm we advanced.
        expect(screen.getByText(/connect shopify/i)).toBeTruthy();
    });

    it('walks the full happy path and calls createShop (skipping branding)', async () => {
        render(<NewShopWizard />);
        await fillBasicsAndAdvance();
        // Connect step: Next disabled until connected.
        expect((screen.getByRole('button', { name: /^next$/i }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: /mark-connected/i }));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
        // Branding step: skip.
        fireEvent.click(screen.getByRole('button', { name: /skip/i }));
        // Review step: create.
        mockCreate.mockResolvedValue(undefined);
        fireEvent.click(screen.getByRole('button', { name: /create shop/i }));
        await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
        const arg = mockCreate.mock.calls[0]![0];
        expect(arg.name).toBe('Acme');
        expect(arg.domain).toBe('shop.acme.com');
        expect(arg.provider.type).toBe('shopify');
        expect(arg.branding).toBeNull();
    });

    it('surfaces a createShop failure on the review step', async () => {
        render(<NewShopWizard />);
        await fillBasicsAndAdvance();
        fireEvent.click(screen.getByRole('button', { name: /mark-connected/i }));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
        fireEvent.click(screen.getByRole('button', { name: /skip/i }));
        mockCreate.mockResolvedValue({ ok: false, error: 'domain taken' });
        fireEvent.click(screen.getByRole('button', { name: /create shop/i }));
        await waitFor(() => expect(screen.getByText(/domain taken/)).toBeTruthy());
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin "src/app/(app)/(setup)/new/wizard.test.tsx"`
Expected: FAIL — `Cannot find module './wizard'`.

- [ ] **Step 3: Write `wizard.tsx`**

Create `apps/admin/src/app/(app)/(setup)/new/wizard.tsx`:

```tsx
'use client';

import { Button, Card, Heading, Input, Label } from '@nordcom/nordstar';
import { useCallback, useState } from 'react';

import { COMMERCE_PROVIDERS, PROVIDER_ORDER } from '@/lib/commerce-providers/registry';
import { DEFAULT_SHOP_LOCALE } from '@/lib/new-shop/defaults';
import type { CreateShopInput } from '@/lib/new-shop/types';
import { isValidHostname, isValidLocale } from '@/lib/new-shop/validation';
import { checkDomainAvailability, createShop } from './actions';

/** Availability state for the typed customer-facing domain. */
type DomainStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/** The four ordered wizard steps. */
const STEPS = ['Basics', 'Connect', 'Branding', 'Review'] as const;

/** Props for {@link NewShopWizard}. */
export type NewShopWizardProps = {
    /**
     * The platform service domain operators point their DNS at, passed from the server page (which reads
     * `process.env.SERVICE_DOMAIN` — a server-only var with no `NEXT_PUBLIC_` mirror, so it cannot be read
     * in this client component). Shown in the review-step DNS hint; falls back to generic copy when unset.
     */
    serviceDomain?: string;
};

/**
 * The "Connect a new Shop" wizard: a four-step client flow (Basics → Connect → Branding → Review) that
 * collects shop identity, a validated commerce-provider connection, and optional branding, then submits
 * one `createShop` server action. Each step gates the Next button on its own validity (available domain;
 * tested connection). The Connect step renders entirely from the commerce-provider registry, so it is
 * provider-agnostic.
 *
 * @param props - {@link NewShopWizardProps}.
 * @returns The wizard UI.
 */
export function NewShopWizard({ serviceDomain }: NewShopWizardProps): React.JSX.Element {
    const [step, setStep] = useState(0);

    // Basics
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const [locale, setLocale] = useState(DEFAULT_SHOP_LOCALE);
    const [domainStatus, setDomainStatus] = useState<DomainStatus>('idle');

    // Connect — the registry order is the single source of truth for the default provider. The connect
    // STEP is registry-driven (renders the selected provider's ConnectForm); a multi-provider PICKER is a
    // follow-up for when a second provider lands. `?? 'shopify'` keeps the lookup total under
    // noUncheckedIndexedAccess.
    const [providerType] = useState<(typeof PROVIDER_ORDER)[number]>(PROVIDER_ORDER[0] ?? 'shopify');
    const [connectValues, setConnectValues] = useState<Record<string, string>>({});
    const [connectionOk, setConnectionOk] = useState(false);

    // Branding (null until the operator chooses colors; skipping keeps it null)
    const [primaryColor, setPrimaryColor] = useState('#1a1a1a');
    const [secondaryColor, setSecondaryColor] = useState('#f5f5f5');
    const [branding, setBranding] = useState<CreateShopInput['branding']>(null);

    // Review
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    /**
     * Validates the typed domain's format and, when valid, live-checks its availability via the seam,
     * driving the Basics-step status indicator and Next gate.
     *
     * @returns Resolves once `domainStatus` reflects the outcome.
     */
    const onDomainBlur = useCallback(async (): Promise<void> => {
        if (!isValidHostname(domain)) {
            setDomainStatus('invalid');
            return;
        }
        setDomainStatus('checking');
        const { available } = await checkDomainAvailability(domain);
        setDomainStatus(available ? 'available' : 'taken');
    }, [domain]);

    const basicsValid = name.trim().length > 0 && domainStatus === 'available' && isValidLocale(locale);
    const provider = COMMERCE_PROVIDERS[providerType];

    /**
     * Submits the collected wizard state to `createShop`. On success the action redirects (the promise
     * never resolves normally); a resolved value is always a failure, surfaced on the review step.
     *
     * @returns Resolves once a failure is shown, or never (server redirect) on success.
     */
    const submit = useCallback(async (): Promise<void> => {
        setSubmitting(true);
        setSubmitError(null);
        const result = await createShop({
            name,
            domain,
            locale,
            provider: { type: providerType, values: connectValues },
            branding,
        });
        // A resolved value only happens on failure — success redirects.
        if (result && result.ok === false) {
            setSubmitError(result.error);
            setSubmitting(false);
        }
    }, [branding, connectValues, domain, locale, name, providerType]);

    return (
        <Card>
            <Heading level="h1">Connect a new Shop</Heading>
            <Label as="div">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </Label>

            {step === 0 ? (
                <div className="flex flex-col gap-4">
                    <Input
                        label="Shop name"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    />
                    <Input
                        label="Customer-facing domain"
                        placeholder="shop.acme.com"
                        value={domain}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setDomain(e.target.value);
                            setDomainStatus('idle');
                        }}
                        onBlur={onDomainBlur}
                    />
                    {domainStatus === 'checking' ? <Label as="span">Checking…</Label> : null}
                    {domainStatus === 'available' ? <Label as="span">Domain is available ✓</Label> : null}
                    {domainStatus === 'taken' ? <Label as="span">That domain is already in use.</Label> : null}
                    {domainStatus === 'invalid' ? (
                        <Label as="span">Enter a full hostname, e.g. shop.acme.com.</Label>
                    ) : null}
                    <label className="flex flex-col gap-1">
                        <span>Default locale</span>
                        <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                            <option value="en-US">en-US</option>
                            <option value="en-GB">en-GB</option>
                            <option value="sv-SE">sv-SE</option>
                            <option value="de-DE">de-DE</option>
                            <option value="fr-FR">fr-FR</option>
                        </select>
                    </label>
                </div>
            ) : null}

            {step === 1 ? (
                <div className="flex flex-col gap-4">
                    <Label as="div">Connect {provider?.label ?? providerType}</Label>
                    {provider ? (
                        <provider.ConnectForm
                            value={connectValues}
                            onChange={setConnectValues}
                            onTestResult={setConnectionOk}
                        />
                    ) : null}
                </div>
            ) : null}

            {step === 2 ? (
                <div className="flex flex-col gap-4">
                    <Label as="div">Branding is optional — you can set it later in settings.</Label>
                    <label className="flex items-center gap-2">
                        <span>Primary</span>
                        <input
                            type="color"
                            aria-label="Primary accent"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                        />
                    </label>
                    <label className="flex items-center gap-2">
                        <span>Secondary</span>
                        <input
                            type="color"
                            aria-label="Secondary accent"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                        />
                    </label>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            color="foreground"
                            onClick={() => {
                                setBranding(null);
                                setStep(3);
                            }}
                        >
                            Skip
                        </Button>
                        <Button
                            variant="solid"
                            color="primary"
                            onClick={() => {
                                setBranding({ primaryColor, secondaryColor });
                                setStep(3);
                            }}
                        >
                            Use these colors
                        </Button>
                    </div>
                </div>
            ) : null}

            {step === 3 ? (
                <div className="flex flex-col gap-3">
                    <Label as="div">Review</Label>
                    <Label as="span">Name: {name}</Label>
                    <Label as="span">Domain: {domain}</Label>
                    <Label as="span">Locale: {locale}</Label>
                    <Label as="span">Provider: {provider?.label ?? providerType}</Label>
                    <Label as="span">Branding: {branding ? 'custom colors' : 'platform defaults'}</Label>
                    <Label as="span">
                        After creating, point your domain&apos;s DNS at {serviceDomain ?? 'our service domain'}.
                    </Label>
                    {submitError ? <Label as="span">Error: {submitError}</Label> : null}
                    <Button variant="solid" color="primary" onClick={submit} disabled={submitting}>
                        {submitting ? 'Creating…' : 'Create shop'}
                    </Button>
                </div>
            ) : null}

            <footer className="flex justify-between pt-4">
                <Button
                    variant="outline"
                    color="foreground"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                >
                    Back
                </Button>
                {step < 2 ? (
                    <Button
                        variant="solid"
                        color="primary"
                        onClick={() => setStep((s) => s + 1)}
                        disabled={(step === 0 && !basicsValid) || (step === 1 && !connectionOk)}
                    >
                        Next
                    </Button>
                ) : null}
            </footer>
        </Card>
    );
}
```

> The Basics step's locale `<select>` is native (nordstar has no `Select`). The DNS hint renders the `serviceDomain` prop, which the server `page.tsx` (Task 8) supplies from `process.env.SERVICE_DOMAIN` — a server-only var (no `NEXT_PUBLIC_` mirror exists), so it MUST be threaded through props, never read with `process.env` inside this client component. When the prop is unset the generic fallback renders.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin "src/app/(app)/(setup)/new/wizard.test.tsx"`
Expected: PASS (gating, happy path, and failure cases green).

- [ ] **Step 5: Commit**

```bash
git add "apps/admin/src/app/(app)/(setup)/new/wizard.tsx" "apps/admin/src/app/(app)/(setup)/new/wizard.test.tsx"
git commit -m "feat(admin): add the multi-step connect-a-new-shop wizard component."
```

---

## Task 8: Wire the page

**Files:**
- Modify: `apps/admin/src/app/(app)/(setup)/new/page.tsx`
- Test: `apps/admin/src/app/(app)/(setup)/new/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/app/(app)/(setup)/new/page.test.tsx`:

```tsx
import { render, screen } from '@/utils/test/react';
import { describe, expect, it, vi } from 'vitest';

const { mockAuth, mockRedirect } = vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockRedirect: vi.fn((url: string): never => {
        throw new RangeError(`NEXT_REDIRECT:${url}`);
    }),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('./wizard', () => ({ NewShopWizard: () => <div data-testid="wizard" /> }));

import SetupNewPage from './page';

describe('SetupNewPage', () => {
    it('redirects to login without a session', async () => {
        mockAuth.mockResolvedValue(null);
        await expect(SetupNewPage()).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('renders the wizard for an authenticated user', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
        render(await SetupNewPage());
        expect(screen.getByTestId('wizard')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --project @nordcom/commerce-admin "src/app/(app)/(setup)/new/page.test.tsx"`
Expected: FAIL — the current page renders headings, not `<NewShopWizard/>`; the "renders the wizard" case fails on the missing testid.

- [ ] **Step 3: Replace `page.tsx`**

Replace the entire contents of `apps/admin/src/app/(app)/(setup)/new/page.tsx` with:

```tsx
import 'server-only';

import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { NewShopWizard } from './wizard';

export const metadata: Metadata = {
    title: 'Connect a new Shop',
};

/**
 * The setup entrypoint for connecting a new shop. Gates on an authenticated session (redirecting to
 * login otherwise) and renders the client wizard that collects the shop, its commerce-provider
 * connection, and optional branding before creating it. Reads the server-only `SERVICE_DOMAIN` and
 * passes it down — the wizard is a Client Component and cannot read the unprefixed env var itself.
 *
 * @returns The new-shop wizard for an authenticated operator.
 */
export default async function SetupNewPage(): Promise<React.JSX.Element> {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/' as Route);
    }

    return <NewShopWizard serviceDomain={process.env.SERVICE_DOMAIN} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --project @nordcom/commerce-admin "src/app/(app)/(setup)/new/page.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/admin/src/app/(app)/(setup)/new/page.tsx" "apps/admin/src/app/(app)/(setup)/new/page.test.tsx"
git commit -m "feat(admin): wire the /new page to the connect-a-new-shop wizard."
```

---

## Task 9: Full verification sweep

**Files:** none (verification + fixups only)

- [ ] **Step 1: Run the full admin test suite**

Run: `pnpm test --project @nordcom/commerce-admin`
Expected: PASS — all new suites plus the pre-existing admin tests green. Fix any regressions before continuing.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS — no `tsc -noEmit` errors. Watch for `noUncheckedIndexedAccess` hits (every `values.x` / `arr[0]` is `T | undefined`) and the `Omit<ShopBase, keyof BaseDocument>` shape on the `Shop.create` call.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: PASS — Biome clean. Confirm no unused imports/params (CLAUDE.md forbids `_`-prefixed suppressions) and that import sorting matches the repo (the lefthook/Biome hook may auto-sort).

- [ ] **Step 4: Build the admin app**

First call `mcp__next-devtools__init`, then run: `pnpm build --filter @nordcom/commerce-admin`
Expected: PASS — the App Router compiles. This is the gate that catches the two blocker classes the review flagged (the Vitest catch-all alias hides them): (a) **no `@/app/*` alias** — every `lib/**` → route import must be relative (the connect form's `./actions`); a stray `@/app/...` errors TS2307 here. (b) **RSC boundary violations** — `new/actions.ts`, `shopify/actions.ts`, and `ping.ts` are server-only; the wizard and connect form are `'use client'` and reach the server only through the `'use server'` actions, never by importing a server-only module directly.

- [ ] **Step 5: Check LSP diagnostics**

Open the created files and confirm there are no outstanding LSP diagnostics (per CLAUDE.md). Fix any before the final commit.

- [ ] **Step 6: Final commit (only if Steps 1–5 produced fixups)**

```bash
git add -A
git commit -m "chore(admin): satisfy lint, typecheck, and build for the new-shop wizard."
```

> No changeset: `@nordcom/commerce-admin` matches the `@nordcom/*` ignore entry in `.changeset/config.json`.

---

## Manual verification (optional, recommended before merge)

Use the `/run` or `/verify` skill, or run `pnpm dev --filter @nordcom/commerce-admin` and:

1. Sign in, visit `/`, click **Connect a new Shop**.
2. **Basics:** enter a name, type an existing shop's domain → expect "already in use"; type a fresh hostname → expect "available ✓"; Next enables.
3. **Connect:** confirm the OAuth method is visibly disabled ("soon"). Paste a real `*.myshopify.com` + a valid Storefront public token → **Test connection** → "Connected to … ✓"; Next enables. Edit a field → connection invalidates, Next disables again.
4. **Branding:** click **Skip**.
3b. Verify the **Test connection** button stays disabled until store domain, public token, AND private token are all filled (the private token is required, not just for the ping).
5. **Review:** confirm the summary + the DNS note (names `SERVICE_DOMAIN` when the env var is set); click **Create shop** → lands on `/<domain>/`. Confirm the new shop appears in the `/` list and that you (the creator) can open its settings (collaborator `['admin']` gate) — this is the end-to-end check that `session.user.id` resolves to a real `users` row (the `SHOP_WRITE_INVALID_COLLABORATOR` invariant the mocked unit tests can't cover).

---

## Self-Review

**1. Spec coverage**

| Resolved decision | Task |
|---|---|
| Manual paste + live ping; OAuth-ready (disabled) seam | Tasks 2 (ping + `testShopifyConnection`), 5 (form method toggle + test) |
| Bespoke multi-step wizard + `Shop.create` server action | Tasks 7 (wizard), 4 (`createShop`) |
| Thin provider registry (UI + mapper split), Shopify-only | Tasks 3 (`mappers`), 6 (`COMMERCE_PROVIDERS` + test), `types.ts` |
| Optional/skippable branding; logo defaulted (empty src); accents from colors | Tasks 1 (`DEFAULT_SHOP_LOGO`/`DEFAULT_SHOP_ACCENTS`), 4 (accent mapping), 7 (skip path) |
| Any authed user → creator becomes `['admin']` collaborator | Tasks 4 (`collaborators`), 8 (auth gate), 9 (manual e2e for the id invariant) |
| Operator types hostname; format + live availability check | Tasks 1 (`isValidHostname`), 4 (`checkDomainAvailability`), 7 (`onDomainBlur`) |
| Private Storefront token required (not just public) | Tasks 5 (Test-button gate), 4 (`createShop` guard) |
| DNS points at `SERVICE_DOMAIN` (no provisioning) | Tasks 8 (`serviceDomain` prop from `process.env.SERVICE_DOMAIN`), 7 (review-step note) |
| Post-create `revalidatePath('/')` + redirect to `/<domain>/` | Task 4 (`createShop`) |

No spec requirement is left without a task.

**2. Placeholder scan**

Every code step contains complete code; every command step contains the exact command and expected output. One flagged unknown remains explicitly called out (not a silent placeholder): the admin test-render utility (Task 5 / Task 6 notes — verify `@testing-library/react` against existing `*.test.tsx` before relying on it; add mocks only if module load fails).

**3. Type consistency**

- `shopifyToCommerceProvider(values: Record<string, string>): CommerceProvider` — same signature used by `PROVIDER_MAPPERS.shopify` (Task 3) and called in `createShop` via `mapper(input.provider.values)` (Task 4); `createShop` narrows the result (`commerceProvider.type === 'shopify'`) for the private-token guard.
- `ConnectFormProps` (`value`/`onChange`/`onTestResult`) — defined in `types.ts` (Task 3), implemented by `ShopifyConnectForm` (Task 5), consumed by the wizard's `provider.ConnectForm` (Task 7) and the registry's stub mock.
- `CreateShopInput` / `CreateShopResult` — defined in `new-shop/types.ts` (Task 4), produced by the wizard's `submit` (Task 7), consumed by `createShop` (Task 4). `createShop` resolves only `{ ok: false, error }`; the wizard branches on `result.ok === false`.
- `ShopifyPingResult` — returned by `pingShopifyStorefront` (Task 2 `ping.ts`), re-returned by `testShopifyConnection` (Task 2 `shopify/actions.ts`), branched in `ShopifyConnectForm.runTest` (Task 5).
- `NewShopWizardProps.serviceDomain?: string` — supplied by `page.tsx` (Task 8) from `process.env.SERVICE_DOMAIN`, consumed in the wizard review note (Task 7).
- `DEFAULT_SHOP_LOGO` / `DEFAULT_SHOP_ACCENTS` / `DEFAULT_SHOP_LOCALE` — defined once (Task 1), consumed in `createShop` (Task 4) and the wizard (Task 7).

**4. Review corrections applied (from the adversarial review)**

| # | Severity | Fix folded in |
|---|---|---|
| 1 | blocker | `testShopifyConnection` co-located in `lib/commerce-providers/shopify/actions.ts`; connect form imports it relatively (`./actions`) — no `@/app/*` alias used (Tasks 2, 5). |
| 2 | blocker | Connect-form test renders a stateful `Harness` that echoes edits back into `value`, so controlled inputs populate and the Test button enables (Task 5). |
| 3 | major | Private Storefront token required: Test-button gate (`!value.privateToken`) + a `createShop` defense-in-depth guard, each with a test (Tasks 5, 4). |
| 4 | minor | Stripe mapper throws `UnknownCommerceProviderError`, not a bare `Error` (Task 3). |
| 5 | minor | DNS note uses a `serviceDomain` prop threaded from the server page's `process.env.SERVICE_DOMAIN`; no `NEXT_PUBLIC_` reference (Tasks 7, 8). |
| 6 | minor | All per-task test runs use a positional filter (no inner `--`), so vitest scopes to the file (every task). |
| 7 | minor | Collaborator-id invariant (`SHOP_WRITE_INVALID_COLLABORATOR`) coverage gap noted; Task 9 manual e2e covers it; optional follow-up integration test flagged (Task 4). |
| 8 | minor | `registry.test.tsx` asserts the real Shopify entry (label, id, `ConnectForm`) and order (Task 6). |
| 9 | minor | JSDoc added to the internal hook callbacks `update`/`runTest` (Task 5) and `onDomainBlur`/`submit` (Task 7). |

**5. Execution outcomes & final-review hardening**

Executed task-by-task via subagent-driven development. Three plan defects surfaced during execution and were folded back in: the dynamic `redirect(...)` needed `as Route` (Task 4); component tests must render via `@/utils/test/react`, not `@testing-library/react` (Tasks 5–8); and a `getByText(/connect/i)` assertion matched 3 elements → narrowed to `/connect shopify/i` (Task 7). A final whole-branch code review found **no Critical issues** and two cheap Important items, both landed:

| # | Item | Fix |
|---|---|---|
| A | `createShop` trusted `domain`/`name` while re-validating the token — asymmetric defense in depth | Added symmetric `!name` and `!isValidHostname(domain)` guards + two tests (Task 4). |
| B | `PROVIDER_ORDER`'s runtime value was dead (wizard hardcoded `'shopify'`); the "no wizard edits" extensibility claim overstated | `providerType` now initializes from `PROVIDER_ORDER[0]`; registry docstrings corrected to scope the claim to the registry-driven connect step (a multi-provider picker is a follow-up) (Tasks 6, 7). |

**Final gate (whole branch):** `pnpm test --project @nordcom/commerce-admin` → 66 files / 290 tests pass, 0 fail. `pnpm typecheck` clean. `pnpm lint` clean on feature files. `pnpm build --filter @nordcom/commerce-admin` compiles with `/new` in the route table.

**6. Post-merge polish pass**

A follow-up review of the merged flow surfaced three issues, all fixed with tests:

| # | Severity | Item | Fix |
|---|---|---|---|
| P1 | major | `createShop` re-validated name/domain-format/token but **not domain availability**. `upsertShop` on the create path does not reject a claimed domain — it inserts a fresh `shops` row, then `reconcileDomains` skips the contested hostname (first-match-wins), silently leaving an unroutable orphan shop. A bypassed or raced client could trigger this. | Added a server-side availability re-check (reusing `checkDomainAvailability`) before `Shop.create`, returning `'That domain is already in use.'` (taken) or `'Could not verify the domain — please try again.'` (transport failure). Two tests (`actions.test.ts`). |
| P2 | major | `onDomainBlur` had a **stale-response race**: editing the domain while a check was in flight, then having the old check resolve `available`, marked the since-changed (unchecked) domain available — defeating the only client-side guard against P1. | Added a monotonic `domainCheckSeq` ref, bumped on check start and on every domain edit; a resolved check whose seq is stale is discarded. One test (`wizard.test.tsx`). |
| P3 | minor | Next 16 TS plugin warning `[71007]` on `ShopifyConnectForm`'s non-serializable `onChange`/`onTestResult` props. | Marked `registry.tsx` `'use client'` (honest: it is client-only UI; `mappers.ts` is the server-safe counterpart). **Correction:** this does NOT clear `[71007]` — the Next TS plugin treats *every* `'use client'` file as an "entry file" and flags exported components with callback props regardless of importer. The warning is an editor-only false positive (absent from `tsc`, `next build`, and `biome`); `ShopifyConnectForm` is only ever rendered by the client wizard via the registry, never by a Server Component, so the callbacks are valid at runtime. Accepted as benign; the `registry` directive is kept for correctness, not as a fix. |
| P4 | minor | `createShop` re-validated name, domain, token, and availability but **not the locale** — it only fell back to the default when the locale was *empty*, so a bypassed client could persist a malformed `defaultLocale` and corrupt `request → shop default → platform default` resolution. | Validate with `isValidLocale`; fall back to `DEFAULT_SHOP_LOCALE` for any invalid tag, not just empty. One test (`actions.test.ts`). |

**Polish gate:** `pnpm test --project @nordcom/commerce-admin` → 66 files / 294 tests pass, 0 fail. `pnpm typecheck --filter @nordcom/commerce-admin` clean. `pnpm biome check` clean on changed files. No changeset (admin matches the `@nordcom/*` ignore).

**7. Design pass — on-brand bold restyle + remaining flow hardening**

The wizard shipped functional but visually plain (a default `Card` with text-only steps). Restyled it to the admin's established bold language — decoded from `globals.css` + the home/login pages: pure-black canvas, hot-pink primary (`hsl(333 85% 52%)`), Montserrat, `rounded-2xl border-3` cards, the eyebrow-`Label` + `<Accented>` + `<Heading>` header pattern, `border-t-3` footer dividers, lucide icons, and `tw-animate-css` reveals. No new aesthetic invented — it now matches `(app)/page.tsx` and the login card.

| Area | Change |
|---|---|
| Shell | Centered `<main>` + `max-w-xl` `rounded-2xl border-3` article on the flat-dark canvas, with one subtle `bg-primary/20 blur-3xl` halo for depth; eyebrow "Connect a <Accented>new</Accented> Shop" + per-step `<Heading>`. |
| Stepper | New `WizardStepper`: four `border-3` icon badges joined by connector bars — active = primary fill, completed = pink check **and clickable to jump back** (backward-only, never bypasses a forward gate), upcoming = muted. Replaces the "Step 1 of 4" text. `aria-current="step"`, per-step `aria-label`. |
| Basics | `DomainStatusBadge` with spinner/check/✗ lucide glyphs in an `aria-live="polite"` region; locale `<select>` restyled (`border-3`, focus→primary). |
| Connect | `ShopifyConnectForm` restyled: full-width segmented method toggle, primary "Test connection" CTA, icon status badges in an `aria-live` region. |
| Branding | `ColorSwatch` live preview — the chosen accent rendered as a tile with `Aa` in the **luminance-derived readable foreground** (the exact pairing `createShop` persists), so contrast is visible before commit. |
| Review | Bordered `<dl>` summary rows + a highlighted DNS callout (primary-tinted) and destructive error callout; full-width `h-12` "Create shop" CTA with a spinner while submitting. |
| Footer | `border-t-3` divider; Back/Next with chevrons. |

Flow-hardening folded into the restyle (the "continue" items):

- **F1 — connection verdict lost on back-nav** (medium): leaving and returning to Connect remounted `ShopifyConnectForm` to an untested state while the wizard still held `connectionOk`, dropping the "Connected ✓" confirmation. Added an optional `verified?: boolean` to `ConnectFormProps`; the form seeds a `restored` state from it and re-shows "Connection verified". Low-churn (no `onTestResult` signature change). One test (`connect-form.test.tsx`).
- **F2 — stale submit error** (low): a failed-create error lingered after navigating back to an earlier step and returning. All step navigation now routes through `goTo`, which clears `submitError`.
- **a11y**: `aria-live` status regions (domain + connection), `aria-current`/`aria-label` on the stepper, `aria-hidden` on decorative icons.

**Design gate:** `pnpm test --project @nordcom/commerce-admin` → 66 files / 295 tests pass, 0 fail. `pnpm typecheck` clean. `pnpm biome check` clean (0 warnings; classes sorted via the project's `--unsafe` convention). `pnpm build --filter @nordcom/commerce-admin` compiles with `/new` in the route table. Not yet visually verified in a running browser (the `/new` page requires an authenticated admin session); structure mirrors the on-brand home/login cards.

**8. Critical runtime bug — nordstar `Input` swallows controlled `onChange`**

Reported in use: a valid domain (`beta.pouched.de`) stuck at "Enter a full hostname, e.g. shop.acme.com." and could not be connected.

Reproduced bottom-up: the deployment query (`db/shops:byDomain`) returns `null` for `beta.pouched.de` → genuinely available, and the seam → `isNotFound` path returns `{ available: true }` correctly. So the block was client-side. Reading the built `@nordcom/nordstar-input` source revealed the cause: `Input` spreads `{...props}` and then sets **its own** `onChange` afterward —

```js
jsx(Tag, { ...props, /* … */ onChange: (e) => setContents(e.target.value), value: contents })
```

— overriding any consumer `onChange`. nordstar `Input` is **uncontrolled by design** (the rest of the admin reads it via FormData/refs). The wizard and Shopify connect form drove it as a controlled input (`onChange={e => setDomain(e.target.value)}`), so keystrokes updated the input's *internal* `contents` (visible text) but never the React state. `domain` stayed `''` → `isValidHostname('')` is false → "invalid" / "Enter a full hostname", and Next never enabled. Every text field (name, domain, all four Shopify credentials) was affected. **The unit tests passed only because they `vi.mock` nordstar's `Input` to forward `onChange`** — masking the real behavior.

Fix: a controlled `components/ui/text-field.tsx` (`TextField`) following the admin's established native-input convention (`color-field.tsx`) — native `<input>`, `onChange(value)`, `border-2`/focus-ring, labeled via `useId`. Replaced every nordstar `Input` in `wizard.tsx` and `connect-form.tsx` with it. The wizard/connect-form suites now render the **real** `TextField` (no Input mock), so their value-lifting assertions (`arg.name`, `arg.domain`, credential ping args) are genuine regression coverage; added `text-field.test.tsx` to lock the `onChange(rawValue)` contract directly.

**Bugfix gate:** 67 files / 297 tests pass, 0 fail. `pnpm typecheck` clean. `pnpm biome check` clean. `pnpm build --filter @nordcom/commerce-admin` compiles.

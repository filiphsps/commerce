# Commerce

Multi-tenant Next.js storefront platform fronting Shopify (with Stripe support stubbed). One deploy serves many shops; tenant resolution happens at the edge by hostname, then every downstream call carries explicit `{ shop, locale }`.

## Language

### Tenancy & routing

**Shop**:
A tenant on the platform — the unit that locale config, commerce-provider config, branding, collaborators, and feature flags attach to.
_Avoid_: store, merchant, site, tenant (in code-level identifiers — see flagged ambiguities), online shop (see flagged ambiguities)

**Hostname**:
The raw `Host` (or `x-forwarded-host`) header on an inbound request. Pre-resolution — may be a primary, alternative, or dev-alias.
_Avoid_: domain (ambiguous — see flagged ambiguities), URL host

**Shop domain**:
A **Shop**'s canonical primary hostname, unique across the platform. Internal rewrites use this, never the raw **Hostname**.
_Avoid_: shop URL, shop host, primary URL

**Alternative domain**:
An additional hostname that resolves to the same **Shop**; lookup by **Hostname** returns the canonical **Shop** regardless of which matched.
_Avoid_: alias, mirror domain

**Service domain**:
The global fallback host where status pages live. Not tenant-scoped; used when shop resolution fails.
_Avoid_: status domain, error host

### Locales

**Locale**:
An `xx-XX` language/region tag carried in the URL path and passed into every data-fetching helper. Dynamic at request time, not encoded in the route tree.
_Avoid_: language, region, market

**Default locale**:
The single locale stored on a **Shop**. Locale resolution terminates here — there is no platform-wide default below it.
_Avoid_: primary locale, fallback locale, platform default (see flagged ambiguities)

**Locale fallback chain**:
The ordered locale-source consultation middleware performs to resolve a request's **Locale**. Terminates at the **Shop**'s **Default locale**.

### Data fetching

**Commerce provider**:
The discriminated union on each **Shop** describing how to talk to its commerce backend. Today: `shopify` (full) or `stripe` (stub).
_Avoid_: backend, integration, vendor

**Provider token**:
A credential bound to a **Shop**'s **Commerce provider**. Required to construct a **Shopify API client**; forbidden in any client-component payload.
_Avoid_: API key, access token, Shopify key

**Shopify API client**:
The only sanctioned way to make a Shopify call; always constructed per `{ shop, locale }` and never reused across tenants. Two concrete implementations exist — see flagged ambiguities.
_Avoid_: Shopify wrapper, GraphQL client, Hydrogen client

### Caching

**Cache namespace**:
A top-level partition distinguishing entire systems whose invalidation lifecycles must not entangle. Today: `shopify` (storefront reads) and `cms` (content reads).
_Avoid_: cache zone, cache realm, cache root

**Tenant-scoped cache**:
A structural invariant — every cached entity's tags include a **Shop** key, so revalidating one tenant cannot touch another's data.
_Avoid_: per-shop cache, tenant cache key

**Locale-qualified cache**:
Within a **Tenant-scoped cache**, entities are further keyed by **Locale**. Locale is a qualifier *under* tenant, not above it.
_Avoid_: locale cache, per-locale cache

### CMS

**CMS**:
The Convex-native content layer (`@nordcom/commerce-cms` field descriptors + editor primitives; content rows live in Convex), multi-tenant by construction. Read by the **Storefront** through the Convex `cms/read` functions, edited via the **Admin** app. Built on Payload 3.x before the Convex migration — see `.specs/2026-05-30-convex-migration/` for that history.
_Avoid_: Payload (the retired predecessor), content layer

**CMS tenant**:
The tenant key every CMS content row carries — since the Convex migration this **is** the **Shop**'s id (the `shop` field on each `cms` table). Shop == tenant: the dedicated `tenants` collection is gone, so there is no separate CMS-side record to create or sync.
_Avoid_: CMS shop, payload tenant, content tenant

**Block**:
A discriminated-union content unit defined in the **CMS**. Some block types project Shopify data and require a **Block loader**.
_Avoid_: section, content block, widget

**Block loader**:
A Shopify-aware data fetcher injected at the **Storefront** boundary so the **CMS** package can stay Shopify-free.
_Avoid_: data loader, content loader

**Shop extension manifest**:
An optional, declarative per-**Shop** config (`ShopExtensionManifest`, `@nordcom/commerce-cms/extensions`) that UNIFIES — never forks — the per-shop surfaces `resolveExtensions` composes: theme tokens (`resolveTheme`), chrome slot order (`resolveChromeLayout`), section visibility, available **Block** types (`BLOCK_TYPES` / `isBlockType`), and a **Component setting** registry of store-wide defaults (product-card variant selections, per-block defaults, and the build-notifier banner config). The registry is extensible — a new configurable component appends a `COMPONENT_SETTINGS` entry plus a `ResolvedExtensions` field, not a new manifest concept; don't hard-count the surfaces. CMS-safe — the type and its pure `resolveExtensions` composer import only the db theme leaf, the errors package, and CMS-internal schemas; never React, Shopify, the **Storefront**, or a **Provider token** — so the **Block loader** firewall holds. An absent or empty manifest composes byte-identically to today's render.
_Avoid_: theme config, shop settings, plugin manifest

**Component setting**:
A per-**Shop** store-wide default for one configurable **Storefront** component, declared as a `COMPONENT_SETTINGS` entry (`@nordcom/commerce-cms/extensions`) and folded into `ResolvedExtensions` by `resolveExtensions`. Each setting is `overridable` — the editor renders an inherit/override control and the stored value omits inherited keys (the cascade falls through to a platform or localized default). Today: the **Product card** and the build-notifier banner. NOT a **Feature flag** — it carries no global `key` or `targeting[]`; it is per-shop presentation config layered over a default, not a globally-targeted toggle.
_Avoid_: feature flag, shop setting, component config, plugin setting

**Extension code sandbox** (deferred):
The future, separate security project that would load and execute untrusted third-party extension code or remote assets at runtime, layered atop the **Block loader** firewall. NOT built today: the **Shop extension manifest** is data-only, and component registration happens via statically-imported, in-repo `register*` entrypoints on the **Storefront** side (`registerProductCardPicker` / `registerProductCardCta`, surfaced by `registerExtensionComponents`). **Block** and chrome dispatch are compile-time-exhaustive records with no runtime register API.
_Avoid_: plugin runtime, dynamic loader, hot-loaded extension

**Homepage slug**:
The reserved CMS **Pages** slug `homepage`. The **Storefront** middleware rewrites a bare `/<locale>/` to `/<locale>/homepage/` before routing, so the index page must be persisted under this exact slug — `home`, `index`, or any other variant resolves to a 404.
_Avoid_: home, index, root, landing

### Errors

**Commerce error**:
An error thrown via a class from `@nordcom/commerce-errors` — never `new Error(...)`. Carries an `*ErrorKind`, an HTTP `statusCode`, and a code looked up by `getErrorFromCode`.
_Avoid_: plain Error, custom Error, exception

### Configuration

**Feature flag**:
A globally-defined named toggle with a `key`, `defaultValue`, optional `options[]`, and `targeting[]` rules. A **Shop** opts in by storing a ref to a flag. Distinct from a **Component setting**: a flag is global + targeted; a setting is per-shop component config with no key/targeting.
_Avoid_: flag, switch, toggle, A/B variant

**Collaborator**:
A user with access to a specific **Shop**, with role-style `permissions[]`. The **CMS** mirrors this list so admin-app and CMS access predicates resolve the same source of truth.
_Avoid_: editor, admin user, team member, member

### Apps

**Storefront** (`apps/storefront`):
The customer-facing surface and the only multi-tenant-by-hostname app.
_Avoid_: front-end, public site, customer site

**Admin** (`apps/admin`):
The internal editor surface. Single-tenant deployment operating across all **Shops**; hosts the embedded **CMS** at `/cms`.
_Avoid_: dashboard, backoffice, CMS app

**Landing** (`apps/landing`):
The marketing surface, hosted at the **Service domain**. Owns the `/status/*` routes the **Storefront** falls back to.
_Avoid_: marketing site, homepage, public site

### Product card

**Product card**:
A token-driven chassis + primitives composed by **Surface wrappers** on every browse surface (Collection, Recommendation, Search). It is a browse tile, not a buy form — variant selection happens in a **Picker**.
_Avoid_: product tile, product item, mini PDP

**Surface wrapper**:
A per-surface composition of the **Product card** (`CollectionProductCard`, `RecommendationProductCard`, `SearchProductCard`). Each spreads its preset from `SURFACE_PRESETS` in `product-card/presets.ts` onto the orchestrator.
_Avoid_: card variant, product card wrapper

**Picker**:
The variant-selection UI opened from a **Product card**'s **CTA**. Presents as `float`, `sheet`, or `inline` per the surface + viewport routing rule. Implementations are registered in `product-card/picker/`.
_Avoid_: variant modal, quick-add modal, options dialog

**Quick add**:
Informal name for the **Picker** entry point. The CTA placement is itself token-driven (`float-pill` | `inline-button`) and registered in `product-card/cta/`.
_Avoid_: quick view, add-to-cart button (when on a card)

**Single-buyable variant fast-path**:
When a product has exactly one variant AND it is available, clicking `+` adds it directly without opening the **Picker**. The CTA renders a fast-path indicator (`data-fast-path`).
_Avoid_: instant add, one-click add

### Cart package

**Locale Tuple**:
The minimal `{ language, country, currency }` triple that the cart packages and Shopify `@inContext` directive consume. Storefront's richer **Locale** maps to a tuple at the package boundary.
_Avoid_: cart locale, mini locale

**Cart Kernel**:
The host-instantiated object that wires a **Cart Adapter**, middleware, predictors, and event bus together. Exposes `{ read, mutate, create, on, capabilities }` on the server. One Kernel per host process.
_Avoid_: cart engine, cart client

**Cart Adapter**:
A **Commerce provider**-specific implementation of `CartAdapter` (e.g. `@nordcom/cart-shopify`). Owns network calls via an injected **Transport**, declares its **Capabilities**, normalizes raw provider data to the canonical Cart shape, and may expose **Custom mutations**.
_Avoid_: cart driver, cart backend

**Capabilities**:
The feature flags a **Cart Adapter** publishes (`giftCards`, `multipleDiscountCodes`, `buyerIdentity`, `notes`, `cartAttributes`, `lineAttributes`, `customMutations: string[]`). Drive type narrowing of `useCartActions()` and UI visibility (hide gift-card form when `giftCards: false`).
_Avoid_: features, supports

**Transport**:
A host-supplied function bag (e.g. `ShopifyTransport`) that performs the actual provider HTTP/GraphQL call for a **Cart Adapter**. Threads `AdapterCtx` per call so the host resolves the right tenant client. Lives in the host, not the package.
_Avoid_: cart client, cart fetcher

**Cart-ID Storage**:
Server-side interface for persisting the cart-id between requests. `@nordcom/cart-next` ships `httpOnlyCookieStorage()`. Zero-arg — impls rely on framework-contextual storage (`next/headers`, AsyncLocalStorage).
_Avoid_: cart store, cart session, cart persistence

**Auth Bridge**:
Host-supplied glue between the cart packages and the host's auth system. Two halves: server `AuthBridge.resolve()` returning **Buyer Identity** from session, and client `ClientAuthBridge.useBuyerIdentity()` subscribing to session changes. Keeps `next-auth` (and any auth lib) out of the cart packages.
_Avoid_: session adapter, identity provider

**Cart Mutation**:
A typed object describing an intent to change the cart (`{ kind: 'add-line', variantId, quantity, snapshot? }`). Flows from React provider → server action → **Cart Kernel** → **Cart Adapter**. Built-in kinds plus adapter-declared **Custom mutations**.
_Avoid_: cart action (overloaded with "server action"), cart command

**Custom mutation**:
A **Cart Mutation** declared by a **Cart Adapter** beyond the built-ins (e.g. `subscribeFrequency`). Adapters export typed builders; React dispatches via `useCartDispatch()`. Names listed in `capabilities.customMutations`.

**Mutation Queue**:
The client-side ordered list of pending **Cart Mutations** awaiting server confirmation. Strictly serialized — one in flight at a time. Failures cascade-cancel any queued mutation that referenced the failed mutation's output.
_Avoid_: optimistic queue, pending list

**Line Predictor**:
Client-side function `(mutation, ctx) => Partial<CartLine> | null` that fills the synthesized cart-line shape for a predicted `add-line`. First-non-null wins. Built-ins: `snapshotPredictor`, `cachePredictor`.
_Avoid_: optimistic resolver, line filler

**Cart Predictor**:
Client-side function `(projection, mutation, ctx) => Cart` that transforms the projected cart after each mutation. All run in registration order. Built-ins: `quantitySumPredictor`, `subtotalPredictor`.
_Avoid_: cart reducer (reserved for the React-internal reducer)

**Product Snapshot**:
Caller-provided product info (`variantId, productHandle, productTitle, variantTitle, image, unitPrice, compareAtUnitPrice`) passed at the cart-mutation call site so the predictive UI renders a real-looking line immediately. Complete-or-absent — no partial snapshots.
_Avoid_: product hint, variant blob

**Buyer Identity**:
The cart-attached identity of who's checking out: `{ email?, phone?, countryCode?, provider?: { type, data } }`. `provider.data` is an opaque per-adapter session-token bag (Shopify stores `{ customerAccessToken }` there; other adapters use whatever their integration needs). Distinct from a **Collaborator** or a NextAuth user; a cart has a **Buyer Identity** even for guests.
_Avoid_: cart customer, cart user

**Cart Event Bus**:
Two separate buses — a server bus on the **Cart Kernel** (analytics, webhook fanout, `nextEventBridge`) and a client bus on the React provider (`useCartEvents`, devtools, cross-tab handler). Delivery is async fire-and-forget; handler errors are logged, never bubbled.
_Avoid_: cart observer, cart hooks (reserved for React hooks)

**Idempotency Key**:
A per-mutation-call UUID minted by the React layer. Middleware dedupes retries within a 30-second window. NOT a debounce mechanism — each user click mints a fresh key.
_Avoid_: mutation id, request token

## Relationships

- A **Shop** has one primary **Shop domain** and zero or more **Alternative domains**.
- A **Hostname** resolves to one **Shop**; the rewrite then uses the **Shop domain**, never the raw **Hostname**.
- A **Shop** has one **Default locale**; supported locales come from the **Commerce provider** at request time.
- A **Shop** has one **Commerce provider**, which carries the **Provider tokens**.
- Every Shopify call goes through a **Shopify API client**, constructed per `{ shop, locale }` and never reused across tenants.
- Every cached entity lives in a **Cache namespace** and is **Tenant-scoped** and **Locale-qualified**.
- The `shopify` and CMS **Cache namespaces** are isolated — invalidating one does not touch the other.
- A **Shop** has one **CMS tenant** key — its own id; **CMS** reads and writes are always filtered by it.
- A **Shop** has zero or more **Collaborators**; the **CMS** mirrors them so admin-app and CMS access predicates resolve the same list.
- A Shopify-projecting **Block** requires its **Block loader** at the **Storefront** boundary.
- A **Shop**'s index route renders the **Homepage slug** CMS page; the bare path is rewritten by middleware before the route tree is consulted.
- The **Storefront** is the only multi-tenant app; **Admin** and **Landing** are single-tenant.
- The **Landing** app owns the **Service domain**'s `/status/*` routes.
- A **Cart Kernel** wires exactly one **Cart Adapter**; the Adapter's **Capabilities** type-narrow `useCartActions()` on the host via generic threading.
- A **Cart Adapter** never imports the host's **Shopify API client** directly — it receives a **Transport** the host constructs.
- A **Cart Mutation** flows React provider → server action → **Cart Kernel** → **Cart Adapter**, returning a `Cart` that replaces the React provider's `confirmed` state.
- **Line Predictors** run first-non-null-wins per mutation; **Cart Predictors** all run in order on the resulting projection.
- The **Storefront** instantiates the **Cart Kernel**; **Admin** and **Landing** do not.
- The **Cart Kernel** has no concept of tax inclusivity — it stores prices as opaque `Money` and lets the **Cart Adapter** + UI assign meaning.

## Example dialogue

> **Dev:** "A user types `mystore.example` in their browser — what happens before the page renders?"
> **Domain expert:** "Middleware extracts the **Hostname**, resolves it to the canonical **Shop** (matching either primary **Shop domain** or any **Alternative domain**), and rewrites the URL to use the **Shop domain**. Miss → rewrite to the **Service domain**'s `/status/unknown-shop/`."

> **Dev:** "And the locale segment?"
> **Domain expert:** "Path already has an `xx-XX` segment? Keep it. Otherwise walk the **Locale fallback chain** down to the tenant's **Default locale**, then prepend."

> **Dev:** "Why does the Shop record only store a default locale, not the full list?"
> **Domain expert:** "Supported locales are whatever the **Commerce provider** says at request time. Persisting them on the **Shop** would drift the moment a merchant changes a setting."

> **Dev:** "When I write a new data-fetching helper, why must it take `{ shop, locale }`?"
> **Domain expert:** "Tenant context is never implicit. No thread-local 'current shop' — a helper reaching for one is a bug waiting to fire on a cached path."

> **Dev:** "How do I get the Shopify token to build a client?"
> **Domain expert:** "Load the **Shop** with the sensitive-data opt-in. **Provider tokens** are stripped by default and taint-guarded once loaded, so they can't cross into a client component."

> **Dev:** "If I revalidate a product after a webhook, does it nuke every cached page?"
> **Domain expert:** "No. **Tenant-scoped** + **Locale-qualified** means only that (shop, locale, product) tag invalidates. Other shops and other locales stay live, and CMS reads stay live regardless — different **Cache namespace**."

> **Dev:** "Why doesn't the CMS package import from `@shopify/*`?"
> **Domain expert:** "Architectural firewall. Shopify-projecting **Blocks** declare their data needs as a contract; the **Storefront** supplies the **Block loader** at the rendering boundary. The **CMS** never knows what a Shopify product is."

> **Dev:** "I created a new shop. Do I need to manually create the CMS side?"
> **Domain expert:** "No — shop == tenant. CMS rows key directly on the **Shop**'s id; there is no separate CMS-side record to create."

## Flagged ambiguities

- **"domain"** is overloaded three ways and the codebase uses the bare word for all of them:
  1. **Shop domain** — `shop.domain`, the customer-facing primary hostname.
  2. **Hostname** — the raw `Host` header on an inbound request; pre-resolution and may match an **Alternative domain**.
  3. The Shopify myshopify hostname at `shop.commerceProvider.domain` — the *Shopify* side of the integration, never customer-facing.
  Prefer the prefixed terms in prose; reserve bare "domain" for unambiguous contexts (e.g. a JSDoc for `Shop.domain`).
- **"tenant" vs "shop"** — same concept. **Shop** is canonical for the persisted entity and code-level identifiers. "Tenant" is acceptable in prose for the abstract role ("multi-tenant by hostname"); avoid it in type names, variable names, and column names.
- **`OnlineShop` vs `Shop`** — same domain concept, two shapes. **Shop** is the `@nordcom/commerce-db` service over the Convex `shops` table and the authoritative write path (every write goes through the `db/shop_write:upsertShop` mutation). `OnlineShop` is the serialized shape consumers hold at runtime (**Provider tokens** masked, `collaborators` optional and lazy-loaded). The distinction is a serialization concern, not a separate entity.
- **`ShopifyApiClient` vs `ShopifyApolloApiClient`** — two concrete implementations of **Shopify API client**, not synonyms. `ShopifyApolloApiClient` is Apollo + Hydrogen and is the default. `ShopifyApiClient` is a fetch-based stub for cache-controlled paths that need explicit Next.js `fetchOptions.revalidate` / `tags`. Same `ShopifyApiOptions` shape, different runtime clients.
- **"supported locales"** is not persisted. Searching for `supportedLocales` on the **Shop** record will come up empty — the list is derived from the **Commerce provider** at request time. If you find yourself wanting to cache it on the shop, that's an architectural decision, not a missing field — escalate.
- **"platform default locale"** is not a real concept. CLAUDE.md's `request locale → shop default → platform default` may suggest a system-wide policy exists; it doesn't. The chain terminates at the tenant's **Default locale**. The literal `'en-US'` in `middleware/storefront.ts` (`shop.i18n?.defaultLocale ?? 'en-US'`) is a code-level last-resort safety net for malformed shop records, not policy.
- **`Locale` (class) vs Locale (tag)** — the glossary term **Locale** is the `xx-XX` tag string, the unit that flows through URLs and APIs. In storefront code, `Locale` is also a TypeScript class wrapping the tag with helpers (`Locale.default`, `Locale.current`, `Locale.from(...)`). Treat the tag as the noun and the class as a utility. Prose that says "the locale" usually means the tag; code that reads "the Locale" usually means the class instance.
- **"the shop record" pre- vs post-Convex-migration** — historically THREE Shop-related stores coexisted (the Mongoose `Shop`, a Payload `tenants` mirror, and a Payload `shops` editor view; see `.specs/2026-05-30-convex-migration/`). Post-migration there is exactly ONE: the Convex `shops` table, fronted by the `@nordcom/commerce-db` `Shop` service. The editor's shop surface and the **CMS tenant** key both resolve to that same row — if you find prose or comments describing a tenants sync or a Payload shops collection, it is historical.
- **"the cart" pre- vs post-package-migration** — pre-migration, the cart lives in `apps/storefront/src/{api,components,utils,app/[domain]/[locale]/_actions}/cart*` and references to "cart code" mean those paths. Post-migration the canonical surface is `@nordcom/cart-{core,react,next,shopify}` and those storefront paths are deleted except for UI primitives (`cart-line.tsx`, `cart-summary.tsx`, etc.) that consume the package hooks. The new packages are the source of truth.
- **"predictor"** — bare word is ambiguous; the cart packages ship two flavors with different semantics. **Line Predictor** synthesizes a cart line, first-non-null wins. **Cart Predictor** transforms the projected cart, all run in order. Always qualify in prose and identifiers.
- **"cart action"** — overloaded between a **Cart Mutation** (the intent object) and a Next.js server action (the `'use server'` function exported from the host). The package's typed factories return server actions; the React side dispatches **Cart Mutations** to them. Prefer "**Cart Mutation**" for the intent and reserve "action" / "server action" for the Next.js primitive.

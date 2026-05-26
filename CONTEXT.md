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
A top-level partition distinguishing entire systems whose invalidation lifecycles must not entangle. Today: `shopify` (storefront reads) and CMS (Payload reads).
_Avoid_: cache zone, cache realm, cache root

**Tenant-scoped cache**:
A structural invariant — every cached entity's tags include a **Shop** key, so revalidating one tenant cannot touch another's data.
_Avoid_: per-shop cache, tenant cache key

**Locale-qualified cache**:
Within a **Tenant-scoped cache**, entities are further keyed by **Locale**. Locale is a qualifier *under* tenant, not above it.
_Avoid_: locale cache, per-locale cache

### CMS

**CMS**:
The Payload 3.x content layer (`@nordcom/commerce-cms`), multi-tenant by construction. Read by the **Storefront**, edited via the **Admin** app.
_Avoid_: Payload (the underlying library), content layer

**CMS tenant**:
A row in the CMS's `tenants` collection — the lightweight tenant key consumed by Payload's multi-tenant plugin. One per **Shop**, synced unidirectionally from the Mongoose **Shop**. Distinct from the Payload `shops` collection — see flagged ambiguities.
_Avoid_: CMS shop, payload tenant, content tenant

**Block**:
A discriminated-union content unit defined in the **CMS**. Some block types project Shopify data and require a **Block loader**.
_Avoid_: section, content block, widget

**Block loader**:
A Shopify-aware data fetcher injected at the **Storefront** boundary so the **CMS** package can stay Shopify-free.
_Avoid_: data loader, content loader

**Homepage slug**:
The reserved CMS **Pages** slug `homepage`. The **Storefront** middleware rewrites a bare `/<locale>/` to `/<locale>/homepage/` before routing, so the index page must be persisted under this exact slug — `home`, `index`, or any other variant resolves to a 404.
_Avoid_: home, index, root, landing

### Errors

**Commerce error**:
An error thrown via a class from `@nordcom/commerce-errors` — never `new Error(...)`. Carries an `*ErrorKind`, an HTTP `statusCode`, and a code looked up by `getErrorFromCode`.
_Avoid_: plain Error, custom Error, exception

### Configuration

**Feature flag**:
A globally-defined named toggle with a `key`, `defaultValue`, optional `options[]`, and `targeting[]` rules. A **Shop** opts in by storing a ref to a flag.
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

## Relationships

- A **Shop** has one primary **Shop domain** and zero or more **Alternative domains**.
- A **Hostname** resolves to one **Shop**; the rewrite then uses the **Shop domain**, never the raw **Hostname**.
- A **Shop** has one **Default locale**; supported locales come from the **Commerce provider** at request time.
- A **Shop** has one **Commerce provider**, which carries the **Provider tokens**.
- Every Shopify call goes through a **Shopify API client**, constructed per `{ shop, locale }` and never reused across tenants.
- Every cached entity lives in a **Cache namespace** and is **Tenant-scoped** and **Locale-qualified**.
- The `shopify` and CMS **Cache namespaces** are isolated — invalidating one does not touch the other.
- A **Shop** has one **CMS tenant**; **CMS** reads and writes are always filtered by it.
- A **Shop** has zero or more **Collaborators**; the **CMS** mirrors them so admin-app and CMS access predicates resolve the same list.
- A Shopify-projecting **Block** requires its **Block loader** at the **Storefront** boundary.
- A **Shop**'s index route renders the **Homepage slug** CMS page; the bare path is rewritten by middleware before the route tree is consulted.
- The **Storefront** is the only multi-tenant app; **Admin** and **Landing** are single-tenant.
- The **Landing** app owns the **Service domain**'s `/status/*` routes.

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
> **Domain expert:** "No — the **CMS tenant** is synced from the **Shop** automatically."

## Flagged ambiguities

- **"domain"** is overloaded three ways and the codebase uses the bare word for all of them:
  1. **Shop domain** — `shop.domain`, the customer-facing primary hostname.
  2. **Hostname** — the raw `Host` header on an inbound request; pre-resolution and may match an **Alternative domain**.
  3. The Shopify myshopify hostname at `shop.commerceProvider.domain` — the *Shopify* side of the integration, never customer-facing.
  Prefer the prefixed terms in prose; reserve bare "domain" for unambiguous contexts (e.g. a JSDoc for `Shop.domain`).
- **"tenant" vs "shop"** — same concept. **Shop** is canonical for the persisted entity and code-level identifiers. "Tenant" is acceptable in prose for the abstract role ("multi-tenant by hostname"); avoid it in type names, variable names, and column names.
- **`OnlineShop` vs `Shop`** — same domain concept, two shapes. **Shop** is the Mongoose model and the authoritative write path. `OnlineShop` is the serialized shape consumers hold at runtime (Document methods stripped, `collaborators` optional and lazy-loaded). The distinction is a serialization concern, not a separate entity.
- **`ShopifyApiClient` vs `ShopifyApolloApiClient`** — two concrete implementations of **Shopify API client**, not synonyms. `ShopifyApolloApiClient` is Apollo + Hydrogen and is the default. `ShopifyApiClient` is a fetch-based stub for cache-controlled paths that need explicit Next.js `fetchOptions.revalidate` / `tags`. Same `ShopifyApiOptions` shape, different runtime clients.
- **"supported locales"** is not persisted. Searching for `supportedLocales` on the **Shop** record will come up empty — the list is derived from the **Commerce provider** at request time. If you find yourself wanting to cache it on the shop, that's an architectural decision, not a missing field — escalate.
- **"platform default locale"** is not a real concept. CLAUDE.md's `request locale → shop default → platform default` may suggest a system-wide policy exists; it doesn't. The chain terminates at the tenant's **Default locale**. The literal `'en-US'` in `middleware/storefront.ts` (`shop.i18n?.defaultLocale ?? 'en-US'`) is a code-level last-resort safety net for malformed shop records, not policy.
- **`Locale` (class) vs Locale (tag)** — the glossary term **Locale** is the `xx-XX` tag string, the unit that flows through URLs and APIs. In storefront code, `Locale` is also a TypeScript class wrapping the tag with helpers (`Locale.default`, `Locale.current`, `Locale.from(...)`). Treat the tag as the noun and the class as a utility. Prose that says "the locale" usually means the tag; code that reads "the Locale" usually means the class instance.
- **Payload `shops` collection vs Mongoose `Shop` vs Payload `tenants`** — three Shop-related entities, not three sources of truth. The Mongoose **Shop** (`@nordcom/commerce-db`) is the authoritative write path; `Shop.findByDomain` reads it directly without going through Payload. The Payload `tenants` collection is the synced, lightweight **CMS tenant**. The Payload `shops` collection is an editor-facing view of the same Mongo collection, with Payload-layer hooks for secret stripping and role-gated writes. The Payload `shops` collection has **no `afterChange` sync** back to Mongoose, and the `shopBridge` referenced in its source-comment doesn't exist in the codebase — treat it as a partial scaffold for an unrealized bridge.

# Commerce

Multi-tenant Next.js storefront platform fronting Shopify (with Stripe support stubbed). One deploy serves many shops; tenant resolution happens at the edge by hostname, then every downstream call carries explicit `{ shop, locale }`.

## Language

### Tenancy & routing

**Shop**:
A tenant on the platform. Persisted as a row in the `shops` MongoDB collection. Carries default-locale config, commerce-provider config (including tokens), design assets, integrations, and feature-flag refs — everything tenant-scoped lives on this one document.
_Avoid_: store, merchant, site, tenant (in code-level identifiers — see flagged ambiguities)

**Hostname**:
The raw `Host` (or `x-forwarded-host`) header on an inbound request. Pre-resolution — may be a primary shop domain, an alternative domain, or a localhost dev alias.
_Avoid_: domain (ambiguous — see flagged ambiguities), URL host

**Shop domain**:
A shop's canonical primary hostname — the `domain` field on the `Shop` record, unique across the collection. After middleware resolves an inbound **Hostname**, all internal URL rewrites use the **Shop domain**, not the raw hostname.
_Avoid_: shop URL, shop host, primary URL

**Alternative domain**:
An additional hostname that resolves to the same **Shop**. Stored as `shop.alternativeDomains[]`. `Shop.findByDomain` matches against either the primary **Shop domain** or any alternative; lookup returns the same canonical **Shop**.
_Avoid_: alias, mirror domain

**Service domain**:
The global fallback host (env var `SERVICE_DOMAIN`) where status pages live — `/status/unknown-shop/`, `/status/unknown-error/`. Used when shop resolution fails. Not tenant-scoped.
_Avoid_: status domain, error host

### Locales

**Locale**:
A `xx-XX` language/region tag carried in the URL path (`/[domain]/[locale]/…`) and passed into every data-fetching helper. The locale segment is dynamic at request time, not encoded in the route file tree.
_Avoid_: language, region, market

**Default locale**:
The single locale stored on `shop.i18n.defaultLocale`. Acts as the terminal fallback. Distinct from "supported locales," which the platform does **not** persist — supported locales come from Shopify at request time via `LocalesApi`.
_Avoid_: primary locale, fallback locale

**Locale fallback chain**:
The middleware's locale resolution order: existing cookie (`localization` / `NEXT_LOCALE`) → `Accept-Language` matched against `(Shopify's available locales ∪ shop default locale)` → shop default. The supported-locale set is fetched fresh from Shopify per uncached request.

### Data fetching

**Commerce provider**:
The discriminated union embedded on each **Shop** describing how to talk to its commerce backend (`shop.commerceProvider`). Today: `'shopify'` (full) or `'stripe'` (stub). Shopify config carries `authentication.{token, publicToken, customers}`, the Shopify `domain`, `storefrontId`, and provider `id`.
_Avoid_: backend, integration, vendor

**Provider token**:
A Shopify API credential bound to a **Shop**'s **Commerce provider**. Loaded only when callers opt in via `Shop.findByDomain(..., { sensitiveData: true })`. Always guarded with `experimental_taintUniqueValue` on the way out of `ShopifyApiConfig`, so it cannot leak into a client component payload.
_Avoid_: API key, access token, Shopify key

**Sensitive-data load**:
The `{ sensitiveData: true }` option on `Shop.findByDomain`. Without it, the returned shop has provider tokens stripped. Required for any code path that needs to construct a Shopify API client; forbidden for code paths that hand the shop down to a client component.
_Avoid_: full shop, with-tokens

**Shopify API client**:
The only sanctioned way to make a Shopify call. Concrete implementations: `ShopifyApolloApiClient` (Apollo-based, the default) and `ShopifyApiClient` (fetch-based, used in specific cache-controlled paths). Both share the `ShopifyApiOptions` shape `{ shop, locale?, apiConfig?, buyerIp? }` and both go through `ShopifyApiConfig` for token loading + taint. New data-fetching helpers must take `{ shop, locale }` explicitly — tenant context is never implicit.
_Avoid_: Shopify wrapper, GraphQL client (ambiguous with `gql.tada`'s generated client), Hydrogen client

### Errors

**Commerce error**:
An error thrown via a class from `@nordcom/commerce-errors` — never `new Error(...)`. Each error has an `*ErrorKind`, an HTTP `statusCode`, and a code looked up by `getErrorFromCode`. Examples: `NotFoundError`, `ShopMisconfigurationError`, `UnknownCommerceProviderError`, `NoLocaleResolvableError`, `UnknownError`.
_Avoid_: plain Error, custom Error, exception

## Relationships

- A **Shop** has exactly one primary **Shop domain** and zero or more **Alternative domains**
- A **Hostname** resolves to one **Shop** via `Shop.findByDomain` (matching primary or alternative); the rewrite then uses the **Shop domain**, never the raw **Hostname**
- A **Shop** has exactly one **Default locale** but supports the set of locales its **Commerce provider** advertises at request time
- A **Shop** has exactly one **Commerce provider**, which carries the **Provider tokens**
- A **Provider token** is only readable from the database via a **Sensitive-data load**
- Every Shopify call goes through a **Shopify API client**, which is constructed per `{ shop, locale }` pair — never reused across tenants
- Shop resolution failure rewrites to the **Service domain**'s status page, never to another **Shop**

## Example dialogue

> **Dev:** "A user types `mystore.example` in their browser — what happens before the page renders?"
> **Domain expert:** "Edge middleware extracts the **Hostname** from the request, calls `Shop.findByDomain` to resolve it — that matches against both the primary **Shop domain** and any **Alternative domain**. If it hits, we get the canonical **Shop**, and we rewrite the URL to use `shop.domain` going forward. If it misses, we rewrite to the **Service domain**'s `/status/unknown-shop/` page."

> **Dev:** "And the locale segment?"
> **Domain expert:** "If the path already has an `xx-XX` segment, we keep it. Otherwise we walk the **Locale fallback chain** — check the localization cookie, then `Accept-Language` matched against the locales the **Commerce provider** advertises plus the **Default locale**, then fall back to the **Default locale**. The locale gets prepended to the path."

> **Dev:** "Why does the Shop record only store a default locale, not the full list?"
> **Domain expert:** "Because the supported set is whatever Shopify says it is — `availableCountries × availableLanguages` on the storefront. Persisting it on the Shop would drift the moment a merchant flips a setting in Shopify's admin. We ask Shopify per request and cache aggressively instead."

> **Dev:** "When I write a new data-fetching helper, why must it take `{ shop, locale }`?"
> **Domain expert:** "Because tenant context is never implicit. There's no thread-local 'current shop.' If a helper reaches into a request-scoped global to find one, it's a bug waiting to happen on a cached path. Pass them as args, route them through a **Shopify API client**, and the type system stops you from skipping a tenant."

> **Dev:** "How do I get the Shopify token to build a client?"
> **Domain expert:** "You load the shop with `Shop.findByDomain(hostname, { sensitiveData: true })` — that's a **Sensitive-data load**, the opt-in that includes the **Provider tokens**. `ShopifyApiConfig` then taint-guards them so they can't cross a render boundary into a client component."

## Flagged ambiguities

- **"domain"** is overloaded three ways and the codebase uses the bare word for all of them. Distinguish carefully:
  1. **Shop domain** — `shop.domain`, the customer-facing primary hostname.
  2. **Hostname** — the raw `Host` header on an inbound request; pre-resolution and may be an **Alternative domain**.
  3. The Shopify myshopify hostname stored at `shop.commerceProvider.domain` — the *Shopify* side of the integration, never customer-facing.
  When writing prose or comments, prefer the prefixed terms; only use the bare "domain" when context makes it unambiguous (e.g. a doc-string for the `Shop.domain` field).
- **"tenant" vs "shop"** — same concept. **Shop** is canonical for the persisted entity and code-level identifiers (`{ shop, locale }`, `ShopifyApiOptions`, the `shops` collection). "Tenant" remains acceptable in prose for the abstract role ("multi-tenant by hostname"); avoid it in type names, variable names, and column names.
- **`ShopifyApiClient` vs `ShopifyApolloApiClient`** — two different concrete implementations, not synonyms. `ShopifyApolloApiClient` is Apollo + Hydrogen and is the default. `ShopifyApiClient` is a fetch-based stub for cache-controlled paths that need explicit Next.js `fetchOptions.revalidate` / `tags`. They share `ShopifyApiOptions` but produce different runtime clients. The umbrella term **Shopify API client** refers to either.
- **"supported locales"** is not persisted. Searching the codebase for `supportedLocales` or a list on the **Shop** record will come up empty. The list is derived from Shopify at request time. If you find yourself wanting to cache it on the shop, that's an architectural decision, not a missing field — escalate.

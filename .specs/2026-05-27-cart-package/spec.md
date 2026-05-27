# Cart package extraction (`@nordcom/cart-*`)

Extract the cart system from `apps/storefront` into four publishable packages mirroring the tagtree pattern, with first-class extensibility (capabilities, custom mutations, middleware, predictors, event bus, pluggable storage), client-side predictive UI with a serialized mutation queue, and Next.js 16 cache-components-clean SSR.

## Motivation

Current cart implementation lives entirely in `apps/storefront` and has these load-bearing issues:

- **Coupling**: types, adapter contract, and React provider all live in app paths (`api/cart`, `components/cart`, `utils/cart-server.ts`). Adapter depends on app-internal `ShopifyApolloApiClient` and the storefront's `Locale` class. Cannot be reused or published.
- **Half-assed predictive UI**: `synthesizePlaceholderLine` returns empty `productHandle`/`title`/`image` → add-to-cart renders a blank row until the server responds.
- **Ad-hoc Next.js cache wiring**: `readCart` uses `'use cache'` + `cacheTag('cart:${id}')` inline in an app util. Cart is per-user/cookie-bound, so cross-request cache hit rate ≈ 0; the tag adds invalidation surface without measurable savings. Conflicts with Next 16 cache-components rules.
- **No conformance bar for new providers**: only Shopify is implemented and there are no contract tests. Claim of platform-independence is unverified.
- **Server actions hard-wired to app routes**: ten FormData-based functions in `apps/storefront/src/app/[domain]/[locale]/_actions/cart.ts`. Not regenerable or composable from a package.

## Goals

1. Four publishable packages: `@nordcom/cart-core`, `@nordcom/cart-react`, `@nordcom/cart-next`, `@nordcom/cart-shopify`. Tagtree-shape, mirroring `packages/tagtree/{core,next,payload,shopify}` exactly.
2. Cart kernel that wires adapter + middleware + predictors + event bus, instantiated once per host.
3. Adapter contract with capability flags, optional methods gated by capabilities, and adapter-declared custom mutations.
4. Composable middleware pipeline — Koa-style `compose()` over mutation handlers (distinct from `@tagtree/core/compose`, which composes cache adapters; the two share only a name).
5. Predictive client layer with two predictor kinds (Line + Cart), a serialized mutation queue, and cascade-cancel on failure or cross-tab drift.
6. Pluggable cart-id storage (cookie default in `cart-next`; DB-backed future).
7. Pluggable auth bridge (server + client halves) so neither `next-auth` nor the storefront `auth()` leak into the package.
8. Pluggable transport (e.g. `ShopifyTransport`) so the package never imports the host's Apollo client or `@nordcom/commerce-db`.
9. Two event buses (server, client) with async fire-and-forget delivery; handler errors logged, not bubbled.
10. Capability-typed React actions via generic threading — `useCartActions<AppCartCaps>()` returns gift-card methods only when `giftCards: true`.
11. Zero-JS fallback via `<CartForm>` primitive that hydrates the predictive layer on top of native server-action form submit.
12. Contract tests (`@nordcom/cart-core/contract-tests`) that any adapter must pass. Mock adapter (`@nordcom/cart-core/mock-adapter`) for host tests.
13. Dev-only React devtools panel (`@nordcom/cart-react/devtools`) showing the mutation queue, capabilities, event log.
14. Built-in Money model in cart-core (integer cents internally, decimal string at the public type, per-currency scale via `Intl.NumberFormat`).
15. Storefront migrated to the new packages in a single switchover commit at the end of the series; existing E2E suite (`optimistic`, `cross-tab`, `expired-recovery`, `no-JS`, `userError`) passes unchanged.

## Non-goals

- Offline replay queue / IndexedDB persistence.
- Multi-cart per user (B2B "saved carts"); future via custom mutations.
- Server-side cart caching of any kind (cart is per-user, uncached + request-memoized only).
- Payment / checkout flow. Cart ends at `checkoutUrl`.
- Non-Shopify adapter implementation in v1; contract tests prove one is doable.
- RSC-streamed variant manifest predictor; `cachePredictor` covers manifest-style behavior via host-supplied KV.

## Package layout

```
packages/cart/
  core/      @nordcom/cart-core      — kernel, types, contract, contract-tests, mock-adapter, money
  react/     @nordcom/cart-react     — provider, slice hooks, predictor chain, mutation queue, devtools, <CartForm>, <CartHydrator>
  next/      @nordcom/cart-next      — server-action factory, cookie storage, RSC reader/ensurer, event bridge
  shopify/   @nordcom/cart-shopify   — Shopify cart adapter + gql.tada documents + normalizers + testing harness
```

**Dependency graph (publishable):**

- `cart-core` → zero runtime deps. Defines its own error classes (see Errors below). `@nordcom/commerce-errors` is private (`"private": true`) and cannot be a runtime dep of a public package.
- `cart-react` → `cart-core` + React 19 peer.
- `cart-next` → `cart-core` + Next 16 peer. **Type-only** import of `MutationEnvelope`/`ClientAuthBridge` from cart-react where needed; no runtime dep on cart-react.
- `cart-shopify` → `cart-core` only; GraphQL transport injected by host.

**Anti-coupling rules:**

- `cart-core` never imports `react`, `next/*`, `server-only`, `@nordcom/commerce-db`, `@nordcom/commerce-errors`, or any auth library.
- `cart-shopify` never imports the host's `ShopifyApolloApiClient` or `@nordcom/commerce-db`. Adapter accepts an injected `ShopifyTransport`.
- `cart-next` server-only modules import `cart-react` types via `import type` only — no runtime dep, so the cart-react bundle never lands on the server.
- Storefront `Locale` is mapped to a `LocaleTuple = { language, country, currency }` at the package boundary (host's `resolveContext()`).

**Release & versioning:**

- `.changeset/config.json` `ignore` becomes `["@nordcom/*", "!@nordcom/cart-*"]`. Verified via micromatch — drops `@nordcom/cart-*` from the ignore set, keeps `@nordcom/commerce-*` ignored as today.
- All four cart packages release at `0.1.0` on the initial cut. Independent semver thereafter; one changeset per logical change per package.
- Build setup mirrors tagtree: tsc + vite, `dist/index.js` + `.d.ts`, subpath exports for `./contract-tests`, `./mock-adapter`, `./testing`, `./devtools`.

## `@nordcom/cart-core`

### Types

```ts
export type LocaleTuple = { language: string; country: string; currency: CurrencyCode };

export type CurrencyCode = string;        // ISO 4217
export type Money = { amount: string; currencyCode: CurrencyCode };

export type BuyerIdentity = {
    email?: string;
    phone?: string;
    countryCode?: string;
    // Provider-specific session token bag; opaque to core.
    // Shopify stores { type: 'shopify', data: { customerAccessToken } } here.
    provider?: { type: string; data: Record<string, unknown> };
};

export type CartExt = { cart?: unknown; line?: unknown };

export type CartLine<L = {}> = {
    id: string;
    quantity: number;
    merchandise: CartLineMerchandise;
    cost: { subtotal: Money; total: Money };
    attributes: Array<{ key: string; value: string }>;
    discountAllocations: Array<{ discountedAmount: Money; title?: string; code?: string }>;
    custom: L;
};

export type CartLineMerchandise = {
    id: string;
    productId: string;
    productHandle: string;
    productTitle: string;
    productVendor: string | null;
    productType: string | null;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    selectedOptions: Array<{ name: string; value: string }>;
    unitPrice: Money;
    compareAtUnitPrice: Money | null;
    availableForSale: boolean;
    quantityAvailable: number | null;
    sku: string | null;
};

export type Cart<TExt extends CartExt = {}> = {
    id: string;
    providerType: string;
    totalQuantity: number;
    checkoutUrl: string | null;
    lines: CartLine<TExt['line']>[];
    cost: {
        subtotal: Money;
        total: Money | null;
        tax: Money | null;
        shipping: Money | null;
    };
    costStale: boolean;
    discountCodes: Array<{ code: string; applicable: boolean }>;
    giftCards: Array<{ id: string; lastCharacters: string; amountLeft: Money }>;
    buyerIdentity: BuyerIdentity | null;
    note: string | null;
    attributes: Array<{ key: string; value: string }>;
    updatedAt: string;
    custom: TExt['cart'];
};

export type NewCartLine = {
    variantId: string;
    quantity: number;
    attributes?: Array<{ key: string; value: string }>;
};

export type ProductSnapshot = {
    variantId: string;
    productHandle: string;
    productTitle: string;
    variantTitle: string;
    image: { url: string; altText: string | null; width: number; height: number } | null;
    unitPrice: Money;
    compareAtUnitPrice?: Money | null;
};
```

`ProductSnapshot` is **complete or absent** — partial snapshots are a type error. Callers without full data don't pass a snapshot; the kernel falls back to the next line predictor.

### Capabilities

```ts
export type CartCapabilities = {
    giftCards: boolean;
    multipleDiscountCodes: boolean;
    buyerIdentity: boolean;
    notes: boolean;
    cartAttributes: boolean;
    lineAttributes: boolean;
    customMutations: readonly string[];
};
```

Contract-test invariant: a capability set to `true` requires its corresponding adapter method to exist; a method existing requires its capability to be on. No throwing-when-unsupported pattern.

### Adapter contract

```ts
export type AdapterCtx<TShop = unknown> = {
    shop: TShop;
    locale: LocaleTuple;
    idempotencyKey?: string;       // required on mutations; absent on reads
    signal?: AbortSignal;
    logger: ILogger;
    tracer?: ITracer;              // optional OTel tracer; see Tracing below
};

export interface CartAdapter<TExt extends CartExt = {}> {
    readonly type: string;
    readonly capabilities: CartCapabilities;

    getCart(ctx: AdapterCtx, args: { cartId: string }): Promise<Cart<TExt> | null>;
    createCart(ctx: AdapterCtx, args: { lines?: NewCartLine[]; buyerIdentity?: BuyerIdentity }): Promise<Cart<TExt>>;
    addLines(ctx: AdapterCtx, args: { cartId: string; lines: NewCartLine[] }): Promise<Cart<TExt>>;
    updateLines(ctx: AdapterCtx, args: { cartId: string; lines: Array<{ id: string; quantity: number }> }): Promise<Cart<TExt>>;
    removeLines(ctx: AdapterCtx, args: { cartId: string; lineIds: string[] }): Promise<Cart<TExt>>;

    // Optional — presence gated by capabilities
    applyDiscountCodes?(ctx: AdapterCtx, args: { cartId: string; codes: string[] }): Promise<Cart<TExt>>;
    applyGiftCardCodes?(ctx: AdapterCtx, args: { cartId: string; codes: string[] }): Promise<Cart<TExt>>;
    removeGiftCardCodes?(ctx: AdapterCtx, args: { cartId: string; ids: string[] }): Promise<Cart<TExt>>;
    updateBuyerIdentity?(ctx: AdapterCtx, args: { cartId: string; buyerIdentity: BuyerIdentity }): Promise<Cart<TExt>>;
    updateNote?(ctx: AdapterCtx, args: { cartId: string; note: string }): Promise<Cart<TExt>>;
    updateAttributes?(ctx: AdapterCtx, args: { cartId: string; attributes: Array<{ key: string; value: string }> }): Promise<Cart<TExt>>;

    customMutations?: Record<string, CustomMutationHandler<TExt>>;
}

type CustomMutationHandler<TExt> = (ctx: AdapterCtx, args: { cartId: string; payload: unknown }) => Promise<Cart<TExt>>;
```

### Middleware

```ts
export type CartMiddleware = (next: MutationFn) => MutationFn;
export type MutationFn = (mutation: CartMutation, ctx: AdapterCtx) => Promise<Cart>;

export function compose(...middleware: CartMiddleware[]): CartMiddleware;
```

Koa-style chain: each middleware wraps the next, runs forwards on the way in and reverse on the way out. Distinct shape from `@tagtree/core/compose` (which composes adapters, not middleware) — the resemblance is conceptual only.

Built-ins shipped from cart-core:

- `logger()` — entry/exit log line per mutation.
- `idempotency({ store, windowMs })` — short-circuits replays via a pluggable `IdempotencyStore` (default in-memory; pluggable for distributed deploys, see below).
- `retry({ attempts, backoff })` — re-invokes the wrapped chain on transport errors only (never user errors).
- `analytics({ emit })` — host-supplied `emit(event, attrs)` callback for product-analytics emission.
- `tracing({ tracer })` — opens an OTel span per mutation with attrs `{ cart.id, shop.id, mutation.kind, idempotency.key }` and records exceptions; equivalent to the storefront's current `trace.getActiveSpan()?.addEvent(...)` pattern but kernel-owned.

### Idempotency store

```ts
export interface IdempotencyStore {
    get(key: string): Promise<{ result: Cart; recordedAt: number } | null>;
    set(key: string, result: Cart, ttlMs: number): Promise<void>;
}

export function memoryIdempotencyStore(): IdempotencyStore;
```

Memory store is per-process. In horizontally-scaled deployments (Vercel functions, multi-region edge), the same idempotency key on different instances will not dedup — a Redis/KV-backed store is required for cross-instance safety. The interface is the seam; storefront ships memory store in v1 and revisits if cross-instance dedup matters. Shopify-side dedup via the `__idempotency` cart attribute (see `cart-shopify`) is the practical safety net for Shopify deployments.

### Mutation types

```ts
export type CartMutation =
    | { kind: 'add-line'; variantId: string; quantity: number; attributes?: KV[]; snapshot?: ProductSnapshot }
    | { kind: 'update-line'; lineId: string; quantity: number }
    | { kind: 'remove-line'; lineId: string }
    | { kind: 'apply-discount'; code: string }
    | { kind: 'remove-discount'; code: string }
    | { kind: 'apply-gift-card'; code: string }
    | { kind: 'remove-gift-card'; id: string }
    | { kind: 'update-note'; note: string }
    | { kind: 'update-attributes'; attributes: KV[] }
    | { kind: 'update-buyer-identity' }
    | { kind: 'custom'; name: string; payload: unknown };

type KV = { key: string; value: string };

// Submit shape — owned by cart-core so cart-next can reference it
// without depending on cart-react at runtime.
export type MutationEnvelope = {
    mutation: CartMutation;
    idempotencyKey: string;
};

export type SubmitMutation = (envelope: MutationEnvelope) => Promise<CartActionResult>;

export type CartActionFailureReason =
    | 'missing-shop'
    | 'missing-variant'
    | 'missing-line'
    | 'missing-cart'
    | 'invalid-quantity'
    | 'invalid-code'
    | 'unauthorized'
    | 'user-error'
    | 'network-error'
    | 'provider-error';

export type CartActionResult =
    | { ok: true; cart: Cart }
    | {
          ok: false;
          reason: CartActionFailureReason;
          message: string;
          userErrors?: Array<{ field?: string; message: string }>;
          cart?: Cart;
      };
```

### Event bus (server)

```ts
export type CartEvent =
    | { type: 'cart.created'; cart: Cart }
    | { type: 'cart.updated'; cart: Cart; mutation: CartMutation; source: 'self' }
    | { type: 'cart.mutation.failed'; mutation: CartMutation; error: Error; source: 'self' }
    | { type: 'cart.line.added'; line: CartLine; cart: Cart }
    | { type: 'cart.line.removed'; lineId: string; cart: Cart }
    | { type: 'cart.cleared' };

cart.on(type, handler): () => void;
```

Delivery is async fire-and-forget. Each handler runs in its own try/catch; errors go to `ctx.logger.warn`, never to the caller.

### Kernel factory

```ts
export function createCart<TExt extends CartExt = {}, TShop = unknown>(opts: {
    adapter: CartAdapter<TExt>;
    middleware?: CartMiddleware[];
    logger?: ILogger;
}): CartKernel<TExt, TShop>;

export interface CartKernel<TExt, TShop> {
    readonly type: string;
    readonly capabilities: CartCapabilities;
    read(ctx: AdapterCtx<TShop>, args: { cartId: string }): Promise<Cart<TExt> | null>;
    create(ctx: AdapterCtx<TShop>, args?: { lines?: NewCartLine[]; buyerIdentity?: BuyerIdentity }): Promise<Cart<TExt>>;
    mutate(ctx: AdapterCtx<TShop>, mutation: CartMutation): Promise<Cart<TExt>>;
    on<E extends CartEvent['type']>(type: E, handler: (e: Extract<CartEvent, { type: E }>) => void): () => void;
}
```

Kernel does **not** own cart-id storage. Storage is injected into `cart-next` helpers.

### Money helpers

```ts
export type MoneyCents = { cents: number; currencyCode: CurrencyCode };

export const money = {
    parse(m: Money): MoneyCents,
    format(m: MoneyCents): Money,
    add(a: MoneyCents, b: MoneyCents): MoneyCents,
    sub(a: MoneyCents, b: MoneyCents): MoneyCents,
    mul(a: MoneyCents, n: number): MoneyCents,
    eq(a: MoneyCents, b: MoneyCents): boolean,
    lt(a: MoneyCents, b: MoneyCents): boolean,
    gt(a: MoneyCents, b: MoneyCents): boolean,
    zero(cc: CurrencyCode): MoneyCents,
};
```

Scale per currency resolved once via `Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits`, memoized. Cents stored as `number` (well within `Number.MAX_SAFE_INTEGER` for cart totals). Public `Money` uses decimal string (matches Shopify, JSON-safe).

The kernel has no concept of tax inclusivity — cart prices are opaque Money values; meaning is assigned by adapter + UI.

### Errors

`@nordcom/cart-core` defines its own error hierarchy (cart-core has zero runtime deps; commerce-errors is `private: true` and cannot be a public-package runtime dep):

```ts
export class CartError extends Error { constructor(message: string, public cause?: unknown); }
export class CartNotFoundError extends CartError { constructor(cartId: string); }
export class CartProviderError extends CartError {}
export class CartUserError extends CartError {
    constructor(public userErrors: Array<{ field?: string; message: string }>);
}
export class CartCapabilityUnsupportedError extends CartError {
    constructor(public capability: keyof CartCapabilities | string);
}
```

Match by `.name` not `instanceof` (preserves the storefront's existing pattern; `instanceof` is unreliable when the error class's prototype chain has been reset by transpilers).

`@nordcom/commerce-errors` (private, storefront-internal) re-exports these cart-core classes so app code that imports cart errors from commerce-errors keeps working through the migration. Once storefront is fully migrated, host code imports directly from `@nordcom/cart-core`.

### Contract tests

```ts
// @nordcom/cart-core/contract-tests
export function runCartAdapterContract(opts: {
    name: string;
    factory: () => CartAdapter | Promise<CartAdapter>;
}): void;
```

Suite asserts:

1. Capability flag presence ↔ method presence.
2. Lifecycle: `createCart → getCart → addLines → updateLines → removeLines` produces stable cart ID; `totalQuantity` invariants.
3. Errors: missing cart → `CartNotFoundError`; user errors → `CartUserError`; transport throw → `CartProviderError`.
4. Idempotency: same key + same mutation = one effective change (window 30s).
5. Custom mutations: each name in `capabilities.customMutations` has a handler.
6. Type-level: adapter type matches `CartAdapter<TExt>`.
7. Money: returned `Money.amount` is a decimal string, `currencyCode` is ISO 4217.

Framework-neutral core (vanilla `assert`) + Vitest binding.

### Mock adapter

```ts
// @nordcom/cart-core/mock-adapter
export function createMockCartAdapter(opts?: {
    capabilities?: Partial<CartCapabilities>;
    seedCarts?: Cart[];
    latency?: number;
    failOn?: (m: CartMutation) => CartProviderError | null;
}): CartAdapter & { __inspect(): { carts: Cart[]; events: CartEvent[] } };
```

Used by host tests, contract-test self-tests, and Playwright fixtures.

**Subpath-only export.** `createMockCartAdapter` is exposed exclusively at `@nordcom/cart-core/mock-adapter` — never re-exported from the main `@nordcom/cart-core` entry. This keeps the mock's in-memory state out of consumers' production bundles, even if they import other things from cart-core. Hosts importing the mock must use the subpath specifier.

## `@nordcom/cart-react`

### Provider

```tsx
// Provider is dual-generic: capabilities AND cart-extension shape.
type AppCartConfig = { caps: AppCartCaps; ext: AppCartExt };

<CartProvider<AppCartConfig>
    kernelSnapshot={kernelSnapshot}              // { type, capabilities, customMutationNames }
    submitMutation={submitMutation}              // (envelope) => Promise<CartActionResult>; from cart-core
    initialCart={cart}                           // Cart<AppCartExt>
    shopId={shop.id}
    predictors={{ line: [...], cart: [...] }}    // grouped per kind
    clientAuthBridge={clientAuthBridge}
>
    {children}
</CartProvider>
```

The React provider mints a fresh `idempotencyKey: string` (UUID) per call and submits a `MutationEnvelope` (defined in cart-core). `submitMutation: SubmitMutation` is the typed action call surface, wired by the host to `cart-next` typed actions.

Host wires `submitMutation` to a server action that unwraps the envelope and threads `idempotencyKey` into `AdapterCtx` before invoking `kernel.mutate`. See `cart-next`'s `createTypedCartActions` below for the canonical wiring.

`kernelSnapshot` is the client-safe projection of the server kernel — no functions, no storage, no transport. Hooks downstream of the provider — `useCartLines()`, `useCartCost()`, etc. — return `Cart<AppCartExt>`-shaped data narrowed by the provider's `ext` generic, while `useCartActions()` narrows by the provider's `caps` generic.

### Predictor chain

```ts
export type LinePredictor = (mutation: CartMutation, ctx: PredictorCtx) => Partial<CartLine> | null;
export type CartPredictor = (projection: Cart, mutation: CartMutation, ctx: PredictorCtx) => Cart;

// Built-ins
export function snapshotPredictor(): LinePredictor;
export function cachePredictor(opts: { get: (variantId: string) => Partial<CartLineMerchandise> | null }): LinePredictor;
export function quantitySumPredictor(): CartPredictor;
export function subtotalPredictor(): CartPredictor;
```

**Pipeline per mutation:**

1. For `add-line` mutations: synthesize the placeholder cart line. Walk line predictors in registration order; first non-null return wins. If all predictors return `null`, the provider falls back to a minimal placeholder (variantId, quantity, empty product info, current cart's currency for unit price). For non-`add-line` mutations: skip this step.
2. Apply mutation to running cart shape (add the synthesized line / update quantity / remove line / apply discount / etc.). Mark `costStale: true`.
3. Run all cart predictors in registration order to refresh totals on top of the mutated shape.

### Mutation queue

```ts
type PendingMutation = {
    id: string;                    // idempotency key (UUID, fresh per call)
    mutation: CartMutation;
    status: 'predicted' | 'in-flight' | 'failed';
    error?: string;
    startedAt: number;
};

type CartState = {
    confirmed: Cart | null;
    pending: PendingMutation[];
    projected: Cart | null;
};
```

**Strictly serialized.** One mutation in flight at a time. Subsequent mutations queue and predict against the running projection.

**Failure handling (cascade-cancel):**

- Failed mutation marked `failed` with error message.
- Walk remaining queue: any mutation that references the failed mutation's output (e.g., `update-line` on a line added by the failed mutation, identified by `tempId` for `add-line`) is cancelled, status `failed`, reason `precondition-cart-state`.
- Re-fold remaining valid pending mutations against confirmed cart.

**Cross-tab handling (same mechanism):**

- `BroadcastChannel('cart:${shopId}')` receives `{ type: 'cart-updated', cart, cartId }`.
- If `cartId !== current.confirmed.id` → drop (different cart in other tab).
- Else: replace `confirmed`; walk pending queue; cascade-cancel any whose `lineId`/`tempId` no longer maps to a real line in the new confirmed.

### Slice contexts

`CartCount`, `CartLines`, `CartCost`, `CartMeta`, `CartStatus`, `CartActions`, `CartCapabilities`, `CartPending`. Each isolates re-renders (port current pattern).

### Hooks

```ts
useCart(): UseCartReturn;                                   // full snapshot
useMaybeCart(): UseCartReturn | null;
useCartCount(): number;
useCartLines(): { lines: CartLine[]; cartId: string | null };
useCartCost(): { subtotal: Money | null; ...; stale: boolean };
useCartMeta(): { discountCodes, giftCards, buyerIdentity, note, attributes, checkoutUrl };
useCartStatus(): { status; error; cartReady };
useCartActions<Caps extends CartCapabilities>(): CartActions<Caps>;
useCartCapabilities(): CartCapabilities;
useCartPending(lineId?: string): PendingMutation[] | PendingMutation | null;
useCartEvents<E>(type: E, handler: (e) => void): void;
useCartDispatch(): (m: CartMutation) => Promise<CartActionResult>;     // escape hatch for custom mutations; the only way to invoke `kind: 'custom'` from React
```

`CartActions<Caps>` is a conditional type that only exposes capability-gated methods when the corresponding capability is `true`:

```ts
type CartActions<C extends CartCapabilities> = BaseActions
    & (C['giftCards'] extends true ? GiftCardActions : {})
    & (C['multipleDiscountCodes'] extends true ? DiscountActions : {})
    & (C['notes'] extends true ? NoteActions : {})
    & (C['cartAttributes'] extends true ? AttributeActions : {})
    & (C['buyerIdentity'] extends true ? BuyerIdentityActions : {});
```

Host pins `Caps` via const-asserted type param: `useCartActions<AppCartCaps>()` returns the narrowed shape.

### Custom mutations

Adapter exports typed mutation builders, React dispatches via `useCartDispatch()`:

```ts
// @nordcom/cart-shopify
export const shopifyMutations = {
    subscribeFrequency: (args: { lineId: string; frequency: 'weekly' | 'monthly' }): CartMutation =>
        ({ kind: 'custom', name: 'subscribeFrequency', payload: args }),
    updateBuyerCountry: (args: { country: string }): CartMutation =>
        ({ kind: 'custom', name: 'updateBuyerCountry', payload: args }),
};

// app code
const dispatch = useCartDispatch();
await dispatch(shopifyMutations.subscribeFrequency({ lineId, frequency: 'weekly' }));
```

Kernel routes `kind: 'custom'` to `adapter.customMutations[name]`, throws `CartCapabilityUnsupportedError` if not declared.

### `<CartForm>` (zero-JS fallback)

```tsx
<CartForm action="add-line" variantId={id} quantity={1} snapshot={snap}>
    <button type="submit">Add to cart</button>
</CartForm>
```

Renders a native `<form action={...}>` with hidden inputs. With JS: intercepts submit, runs predictive layer, calls `submitMutation`. Without JS: native form post hits the server action, page revalidates. Same `cart` result either way.

### `<CartHydrator>` (RSC + client pair)

RSC variant serializes `initialCart`; client variant calls `setInitialCart` via `startTransition` (preserves current pattern that fixes hydration mismatch).

### Cross-tab sync

Built-in handler subscribes the provider to `BroadcastChannel('cart:${shopId}')` after mount. Broadcasts on every confirmed `cart.updated`. Receives → cart-id-gated replacement + queue re-fold. Source-flag preserved in events: `source: 'broadcast' | 'self'`.

### Auth bridge (client half)

```ts
export interface ClientAuthBridge {
    useBuyerIdentity(): { identity: BuyerIdentity | null; updatedAt: number };
}
```

Provider's internal `BuyerIdentitySync` reads the hook and dispatches `update-buyer-identity` when identity changes by value (deep equality on `email + phone + countryCode + provider`).

### Devtools

Lazy-loaded via separate subpath `@nordcom/cart-react/devtools`. `<CartDevtools />` mounts via portal (dev-only — guarded by `process.env.NODE_ENV`). Panel: confirmed cart JSON, pending queue with status badges, client event log, capabilities, registered predictors/middleware names. Tree-shaken in production.

## `@nordcom/cart-next`

### Cookie storage

```ts
export function httpOnlyCookieStorage(opts?: {
    name?: string;        // default 'nordcom-cart' (preserves existing cookie name)
    secure?: boolean;     // default: process.env.NODE_ENV === 'production' (preserves existing behavior)
    sameSite?: 'lax' | 'strict' | 'none';   // default 'lax'
    maxAge?: number;      // default 60 * 60 * 24 * 180 (180 days — preserves existing cart longevity)
    domain?: string;
    path?: string;        // default '/'
}): CartIdStorage;
```

### Storage interface (re-exported from cart-core)

```ts
export interface CartIdStorage {
    get(): Promise<string | null>;
    set(id: string): Promise<void>;
    clear(): Promise<void>;
}
```

Zero-arg — impls use framework-contextual storage. Cookie impl uses `next/headers`'s `cookies()` directly.

### Server reader / ensurer

```ts
export function createCartReader<TExt, TShop>(opts: {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
}): (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt> | null>;

export function createCartEnsurer<TExt, TShop>(opts: {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
    reader: ReturnType<typeof createCartReader>;
}): (ctx: AdapterCtx<TShop>) => Promise<Cart<TExt>>;
```

`createCartReader` wraps the kernel read with `react.cache()` for per-request dedup. **No `'use cache'`, no `cacheTag`.** Cart is per-user/cookie-bound → cross-request cache hit rate ≈ 0, and Next 16 cache-components forbids `cookies()` inside `'use cache'` anyway. The cart island lives behind a `<Suspense>` boundary in app code; the rest of the page stays cacheable. Documented in package README.

### Server-action factories

```ts
export function createTypedCartActions<TExt, TShop>(opts: {
    kernel: CartKernel<TExt, TShop>;
    storage: CartIdStorage;
    resolveContext: (opts?: { idempotencyKey?: string }) => Promise<AdapterCtx<TShop>>;
    authBridge?: AuthBridge;
    messageLocalizer?: (reason: CartActionFailureReason, userErrorMessage?: string) => Promise<string>;
}): {
    addLine(args: AddLineArgs & { idempotencyKey: string }): Promise<CartActionResult>;
    updateLine(args: UpdateLineArgs & { idempotencyKey: string }): Promise<CartActionResult>;
    removeLine(args: RemoveLineArgs & { idempotencyKey: string }): Promise<CartActionResult>;
    applyDiscountCode(args: { code: string; idempotencyKey: string }): Promise<CartActionResult>;
    removeDiscountCode(args: { code: string; idempotencyKey: string }): Promise<CartActionResult>;
    applyGiftCard(args: { code: string; idempotencyKey: string }): Promise<CartActionResult>;
    removeGiftCard(args: { id: string; idempotencyKey: string }): Promise<CartActionResult>;
    updateNote(args: { note: string; idempotencyKey: string }): Promise<CartActionResult>;
    updateAttributes(args: { attributes: KV[]; idempotencyKey: string }): Promise<CartActionResult>;
    updateBuyerIdentity(args: { idempotencyKey: string }): Promise<CartActionResult>;
    dispatch(envelope: MutationEnvelope): Promise<CartActionResult>;     // envelope = { mutation, idempotencyKey }; called by the React provider's `submitMutation` for every mutation (built-in + custom)
};

export function createFormCartActions(opts: { typed: TypedCartActions }): {
    addLineAction(formData: FormData): Promise<CartActionResult>;
    updateLineAction(formData: FormData): Promise<CartActionResult>;
    // ... one per typed
    dispatchAction(formData: FormData): Promise<CartActionResult>;
};
```

Each method is a server action (`'use server'`). Host re-exports from a `'use server'` module.

`messageLocalizer` is the seam for i18n. When absent, `.message` falls back to a non-localized English string. The storefront wires it to the existing `cart-errors` dictionary scope, preserving current behavior:

```ts
const messageLocalizer = async (reason, userErrorMessage) => {
    if (userErrorMessage) return userErrorMessage;
    const ctx = await getRequestContext();
    const i18n = await getDictionary({ shop: ctx.shop, locale: ctx.locale });
    return getTranslations('cart-errors', i18n).t(reason);
};
```

React provider's `submitMutation` is wired to `typed.dispatch` (so a custom mutation goes through the same path as built-ins). `<CartForm>` uses the form-action wrappers.

`CartActionResult` and `CartActionFailureReason` are defined in cart-core (see Mutation types above) and re-exported from cart-next for ergonomics. Shape matches the current storefront definition exactly.

### `AuthBridge` (server half)

```ts
export interface AuthBridge {
    resolve(): Promise<BuyerIdentity | null>;
}
```

Optional; if provided, `createTypedCartActions` injects buyer identity into mutations that need it (`update-buyer-identity`, optionally as default for `addLine`).

### Event bridge

```ts
export function nextEventBridge(): {
    onKernel: (kernel: CartKernel) => void;
};
```

Subscribes kernel events to Next's `after()` for fire-and-forget side effects (analytics POST, webhook fanout). Host calls it once at module init.

## `@nordcom/cart-shopify`

```ts
export function createShopifyCartAdapter<TExt extends CartExt = {}, TShop = unknown>(opts: {
    transport: ShopifyTransport;
    apiVersion?: string;       // default '2025-10'
    normalizeLine?: (raw: ShopifyCartLine) => CartLine<TExt['line']>;
    normalizeCart?: (raw: ShopifyCart) => Cart<TExt>;
}): CartAdapter<TExt>;

export interface ShopifyTransport {
    query<T = unknown>(doc: unknown, vars: Record<string, unknown>, ctx: AdapterCtx): Promise<{ data: T | null }>;
    mutate<T = unknown>(doc: unknown, vars: Record<string, unknown>, ctx: AdapterCtx): Promise<{ data: T | null }>;
}
```

### Capabilities (defaults)

```ts
{
    giftCards: true,
    multipleDiscountCodes: true,
    buyerIdentity: true,
    notes: true,
    cartAttributes: true,
    lineAttributes: true,
    customMutations: ['updateBuyerCountry'],   // initial example
}
```

### GraphQL documents

Move `apps/storefront/src/api/cart/adapters/shopify-mutations.ts` and `shopify-normalize.ts` into `packages/cart/shopify/src/`. Use `gql.tada` typed against `@nordcom/commerce-shopify-graphql` schema (existing dep). Cart Variant Image fragment selects `id` per fix `af8d35403`.

### Idempotency

Adapter accepts `ctx.idempotencyKey`. Strategy:

- Attach `__idempotency: key` as a cart attribute on first call (Shopify cart attributes are stable storage for cross-call dedup).
- Kernel-level `idempotency()` middleware short-circuits if the same key just succeeded within window.
- Memory-based dedupe window 30s, configurable.

### Custom mutation builders

```ts
export const shopifyMutations = {
    updateBuyerCountry: (args: { country: string }): CartMutation =>
        ({ kind: 'custom', name: 'updateBuyerCountry', payload: args }),
};
```

Adapter's `customMutations.updateBuyerCountry` handler calls the Shopify `cartBuyerIdentityUpdate` mutation with `countryCode` set.

### Mock transport

```ts
// @nordcom/cart-shopify/testing
export function mockShopifyTransport(opts?: { seed?: ShopifyCart[]; failOn?: ... }): ShopifyTransport;
```

Used by `runCartAdapterContract` against `createShopifyCartAdapter({ transport: mockShopifyTransport() })`.

## Storefront wiring (single switchover commit)

### Host-side kernel module

```ts
// apps/storefront/src/cart/kernel.ts
import 'server-only';
import {
    createCart, logger, idempotency, retry, analytics, tracing,
    memoryIdempotencyStore,
} from '@nordcom/cart-core';
import { createShopifyCartAdapter } from '@nordcom/cart-shopify';
import {
    httpOnlyCookieStorage,
    createCartReader, createCartEnsurer,
    createTypedCartActions, createFormCartActions,
    nextEventBridge,
} from '@nordcom/cart-next';
import { trace } from '@opentelemetry/api';
import { shopifyTransport } from './transport';
import { authBridge } from './auth-bridge';
import { resolveContext } from './context';            // thin wrapper around getRequestContext()
import { messageLocalizer } from './localize';         // wraps getDictionary + cart-errors scope
import { emitAnalytics } from './analytics';

const adapter = createShopifyCartAdapter({ transport: shopifyTransport });
export const cartKernel = createCart({
    adapter,
    middleware: [
        logger(),
        tracing({ tracer: trace.getTracer('cart') }),
        idempotency({ store: memoryIdempotencyStore(), windowMs: 30_000 }),
        retry({ attempts: 2 }),
        analytics({ emit: emitAnalytics }),
    ],
});
export type AppCartCaps = typeof cartKernel.capabilities;
export type AppCartExt = {};            // populate when storefront introduces custom cart/line fields
export type AppCartConfig = { caps: AppCartCaps; ext: AppCartExt };

const storage = httpOnlyCookieStorage();
export const readCart = createCartReader({ kernel: cartKernel, storage });
export const ensureCart = createCartEnsurer({ kernel: cartKernel, storage, reader: readCart });
export const typed = createTypedCartActions({
    kernel: cartKernel,
    storage,
    resolveContext,
    authBridge,
    messageLocalizer,
});
export const forms = createFormCartActions({ typed });

nextEventBridge().onKernel(cartKernel);
```

`resolveContext` is the bridge between the package's `AdapterCtx` and the storefront's existing `@/utils/request-context.getRequestContext()` helper:

```ts
// apps/storefront/src/cart/context.ts
import 'server-only';
import { getRequestContext } from '@/utils/request-context';
import type { AdapterCtx } from '@nordcom/cart-core';
import { logger } from '@/utils/logger';
import { CartMissingShopError } from '@nordcom/cart-core';

export async function resolveContext(opts?: { idempotencyKey?: string }): Promise<AdapterCtx<OnlineShop>> {
    const ctx = await getRequestContext();
    if (!ctx) throw new CartMissingShopError();
    return {
        shop: ctx.shop,
        locale: { language: ctx.locale.language, country: ctx.locale.country!, currency: ctx.locale.currency! },
        idempotencyKey: opts?.idempotencyKey,
        logger,
    };
}
```

### Host-side transport

```ts
// apps/storefront/src/cart/transport.ts
import 'server-only';
import type { ShopifyTransport } from '@nordcom/cart-shopify';
import type { AdapterCtx } from '@nordcom/cart-core';
import type { OnlineShop } from '@nordcom/commerce-db';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { Locale } from '@/utils/locale';

const cache = new Map<string, Awaited<ReturnType<typeof ShopifyApolloApiClient>>>();

async function client(ctx: AdapterCtx) {
    const shop = ctx.shop as OnlineShop;
    const localeCode = `${ctx.locale.language}-${ctx.locale.country}`;
    const key = `${shop.id}:${localeCode}`;
    let c = cache.get(key);
    if (!c) {
        c = await ShopifyApolloApiClient({ shop, locale: Locale.from(localeCode)! });
        cache.set(key, c);
    }
    return c;
}

export const shopifyTransport: ShopifyTransport = {
    async query(doc, vars, ctx) { return (await client(ctx)).query(doc as never, vars); },
    async mutate(doc, vars, ctx) { return (await client(ctx)).mutate(doc as never, vars); },
};
```

### Host-side auth bridge

```ts
// apps/storefront/src/cart/auth-bridge.ts (server half)
import { auth } from '@/auth';
export const authBridge: AuthBridge = {
    async resolve() {
        const session = await auth();
        if (!session?.user) return null;
        return {
            email: session.user.email ?? undefined,
            provider: session.user.shopifyAccessToken
                ? { type: 'shopify', data: { customerAccessToken: session.user.shopifyAccessToken } }
                : undefined,
        };
    },
};

// apps/storefront/src/cart/client-auth.ts (client half)
'use client';
import { useSession } from 'next-auth/react';
import type { ClientAuthBridge } from '@nordcom/cart-react';
import type { BuyerIdentity } from '@nordcom/cart-core';

function mapSessionToIdentity(session): BuyerIdentity | null { /* ... */ }

export const clientAuthBridge: ClientAuthBridge = {
    useBuyerIdentity() {
        const session = useSession();
        return { identity: mapSessionToIdentity(session.data), updatedAt: session.lastUpdate ?? 0 };
    },
};
```

The Shopify adapter reads `buyerIdentity.provider?.data.customerAccessToken` when calling Shopify's `cartBuyerIdentityUpdate` mutation. Other adapters can read their own provider-specific tokens from the same bag without core knowing about them.

### Host-side server-actions module

```ts
// apps/storefront/src/app/[domain]/[locale]/_actions/cart.ts
'use server';
import { typed, forms } from '@/cart/kernel';
export const addLine = typed.addLine;
export const updateLine = typed.updateLine;
export const removeLine = typed.removeLine;
export const applyDiscountCode = typed.applyDiscountCode;
export const removeDiscountCode = typed.removeDiscountCode;
export const applyGiftCard = typed.applyGiftCard;
export const removeGiftCard = typed.removeGiftCard;
export const updateNote = typed.updateNote;
export const updateAttributes = typed.updateAttributes;
export const updateBuyerIdentity = typed.updateBuyerIdentity;
export const dispatch = typed.dispatch;
// form wrappers for <CartForm>
export const addLineAction = forms.addLineAction;
// ... etc.
```

### Files deleted in the switchover

- `apps/storefront/src/api/cart/` (entire directory: `index.ts`, `types.ts`, `adapters/`)
- `apps/storefront/src/components/cart/provider.tsx` + `provider.test.tsx` + `provider-rerender.test.tsx`
- `apps/storefront/src/components/cart/optimistic-reducer.ts` + `optimistic-reducer.test.ts`
- `apps/storefront/src/components/cart/cart-hydrator.tsx` + `cart-hydrator-client.tsx` + `cart-hydrator-client.test.tsx`
- `apps/storefront/src/components/cart/buyer-identity-sync.tsx`
- `apps/storefront/src/components/cart/use-sync-buyer-identity.ts` + `use-sync-buyer-identity.test.ts`
- `apps/storefront/src/utils/cart-server.ts` + `cart-server.test.ts`
- `apps/storefront/src/utils/cart-cookie.ts` + `cart-cookie.test.ts`

### Files rewritten in the switchover

- `apps/storefront/src/app/[domain]/[locale]/_actions/cart.ts` — body becomes thin re-exports of `typed.*` + `forms.*` (see Host-side server-actions module above).
- `apps/storefront/src/app/[domain]/[locale]/_actions/cart.test.ts` — rewritten against the new host-side module. Behavior assertions stay (`reason` codes, `userErrors` propagation, `revalidateTag` removal, OTel events) but mocks now stub `typed.*` rather than `resolveCartProvider` + `ensureCart`. The `revalidateTag` assertion (`expect(revalidateTag).toHaveBeenCalledWith('cart:gid://shopify/Cart/abc', 'max')`) is removed — no consumer of the `cart:*` tag remains after migration.
- `apps/storefront/src/app/[domain]/[locale]/_actions/cart.types.ts` — superseded by re-exports from `@nordcom/cart-core` (`CartActionResult`, `CartActionFailureReason`). File either deleted or kept as a one-line `export * from '@nordcom/cart-core'` for import-path stability across the codebase.

### Cache tag drop is explicit

The migration deletes both `cacheTag('cart:${cartId}')` (in `cart-server.ts`'s `cachedFetchCart`) and `revalidateTag('cart:${cartId}', 'max')` (in every server action). A repo-wide grep confirms these two sites are the only `cart:*` tag producers/consumers — no other code depends on the tag, so the drop is safe. Verification command for the migration PR: `rg -n "cart:" apps/storefront/src --type ts | rg -i 'cacheTag|revalidateTag'` should return zero hits post-migration.

### Files kept (UI primitives that consume new hooks)

- `apps/storefront/src/components/cart/cart-line.tsx` + test — updated imports
- `apps/storefront/src/components/cart/cart-lines.tsx` + test
- `apps/storefront/src/components/cart/cart-summary.tsx` + test
- `apps/storefront/src/components/cart/cart-note.tsx` + test
- `apps/storefront/src/components/cart/cart-coupons.tsx` + test
- `apps/storefront/src/components/header/cart-button.tsx` + test
- `apps/storefront/src/components/products/add-to-cart.tsx` — updated to pass `ProductSnapshot`
- `apps/storefront/src/app/[domain]/[locale]/cart/cart-content.tsx`
- `apps/storefront/src/app/[domain]/[locale]/cart/cart-sidebar.tsx`

### E2E suite preserved

Existing tests must pass unchanged:

- `optimistic` — predictive add/update/remove with rollback on server error
- `cross-tab` — BroadcastChannel sync
- `expired-recovery` — cart-id cleared + new cart created when stale
- `no-JS` — `<CartForm>` works without JS
- `userError` — Shopify user errors surface to UI

If any test asserts implementation details that change (e.g., specific CSS class names in the old provider), the spec accepts targeted test updates within the switchover commit, but no test goal may be loosened.

## Build configuration

Each package mirrors tagtree:

- `tsc + vite` build, output `dist/index.js` + `.d.ts`.
- `biome` for lint + format.
- `vitest` for unit + contract tests.
- `package.json` with `exports` map for `.`, `./contract-tests` (cart-core), `./mock-adapter` (cart-core), `./testing` (cart-shopify), `./devtools` (cart-react).
- `tsconfig.json` extending root with `noUncheckedIndexedAccess: true` per project convention.
- `package.json` `homepage` field pointed at the GitHub Pages docs site per package:
  - `@nordcom/cart-core` → `https://filiphsps.github.io/commerce/cart/core/`
  - `@nordcom/cart-react` → `https://filiphsps.github.io/commerce/cart/react/`
  - `@nordcom/cart-next` → `https://filiphsps.github.io/commerce/cart/next/`
  - `@nordcom/cart-shopify` → `https://filiphsps.github.io/commerce/cart/shopify/`
  Replaces tagtree's pattern of pointing at `https://github.com/filiphsps/commerce/tree/master/packages/.../#readme`. The Pages site path matches `packages/cart/<sub>/` mounted under `/cart/<sub>/`.

## Testing strategy

| Package | Unit | Contract | Integration |
|--|--|--|--|
| `cart-core` | mutation types, reducer apply, predictor chain, compose, money helpers, event bus delivery + error swallowing | `runCartAdapterContract` against `createMockCartAdapter` | — |
| `cart-shopify` | `normalizeCart`, `normalizeLine`, error mapping, idempotency-cart-attribute | `runCartAdapterContract` against `createShopifyCartAdapter({ transport: mockShopifyTransport() })` | — |
| `cart-react` | provider seeding, slice re-render isolation (port `provider-rerender.test.tsx`), queue serialization, cascade-cancel, capability-typed actions narrow correctly, predictor chain | — | RTL tests with mock adapter + mock submit function |
| `cart-next` | cookie storage round-trip, action factory FormData parsing, reader dedup, ensurer create-then-read | — | RSC + server-action integration test in a fixture app |
| Storefront | unchanged | — | existing E2E suite (preserved) |

All packages forward through root `vitest`: `pnpm test --project @nordcom/cart-core` works via existing config.

## Open implementation questions (deferred to plan)

1. **`AbortSignal` plumbing through React provider** — kernel ctx accepts a signal; v1 leaves the hook but doesn't surface a cancel API. Plan task: stub the plumbing; UI cancel button is post-v1.
2. **TypeScript conditional types on `CartActions<C>` when capabilities are partially const-asserted** — likely needs `extends true` guards. Plan task: write a typing-test that asserts gift-card methods only exist when `giftCards: true`.
3. **Devtools bundle-size budget** — devtools must not affect production cart-react bundle. Plan task: enforce via `size-limit` or equivalent on the build output.

## Migration risk register

- **Risk: storefront E2E test churn.** Provider internals change; tests asserting specific implementation details may need updates. Mitigation: keep slice-context names + hook names stable from current `provider.tsx`; port behavior tests verbatim.
- **Risk: NextAuth session shape mismatch.** Client auth bridge depends on `useSession()` returning `{ data, lastUpdate }`. Mitigation: storefront already uses this shape (per `00fd382dc`); add a typing-test in `client-auth.ts`.
- **Risk: Shopify gql.tada schema drift in package.** Schema codegen still owned by `@nordcom/commerce-shopify-graphql`. Mitigation: `cart-shopify` peer-depends on that package, doesn't bundle the schema.
- **Risk: lockfile churn.** Adding four publishable packages + their devDeps will produce a large lockfile diff. Mitigation: changesets per package; CI cache key for node_modules per the recent CI hardening (commit `32a4709cf`).
- **Risk: cache-components compatibility regression elsewhere.** Cart-island must be in a Suspense boundary; if app omits one, the entire page becomes dynamic. Mitigation: enforce in storefront layout PR + add a build-time assertion (custom Next plugin? document as a README rule for v1).

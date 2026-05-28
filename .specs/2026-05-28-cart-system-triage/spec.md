# Cart System Triage — 2026-05-28

## Reported Symptoms

1. Can't add to cart from product cards (listing pages)
2. Can't add to cart from product page
3. Cart page is empty (even after adding items)
4. Cart page sometimes fails to render
5. Infinite reloads on some product pages
6. Slow loading

---

## Architecture Overview

The cart system has four layers:

| Layer | Package | Purpose |
|---|---|---|
| Core | `@nordcom/cart-core` | Pure kernel, middleware, types |
| Next adapter | `@nordcom/cart-next` | Cookie storage, RSC reader, typed actions |
| React layer | `@nordcom/cart-react` | CartProvider, optimistic queue, hooks |
| Shopify adapter | `@nordcom/cart-shopify` | Shopify GraphQL mutations |

### Server-side wiring (layout)
`apps/storefront/src/app/[domain]/[locale]/layout.tsx`

```
RootLayout (per-request, no cache)
└── CartIsland (per-request, no cache)
    ├── resolveContext() → getRequestContext() (reads x-shop-domain / x-locale headers)
    ├── readCart(ctx) (react.cache wrapped, reads nordcom-cart cookie)
    └── CartClientShell(kernelSnapshot, submitMutation=dispatch, initialCart, shopId)
         └── CartProvider (client)
              └── CachedShell ('use cache'; cacheLife('max'))
                   └── [children]
                        └── CartPage ('use cache'; cacheLife('max'))
```

### Cart mutation flow (client → server)
1. `useCartActions().addLine(args)` (client)
2. `CartProvider.runMutation()` → enqueues optimistic entry → calls `submitMutation(envelope)`
3. `submitMutation` = `typed.dispatch` server action from `_actions/cart.ts`
4. `typed.dispatch(envelope)` → `run(opts, mutation, idempotencyKey)` in `cart-next/typed-actions.ts`
5. `resolveContext()` → `getRequestContext()` → reads `x-shop-domain`/`x-locale` from headers
6. `ensureCartId()` → `kernel.mutate()` → Shopify adapter
7. Returns `CartActionResult` with updated cart

---

## Findings

### FINDING-001 [CRITICAL — ROOT CAUSE OF SYMPTOMS 2, 3] `cartReady` permanently `false` — stale-capture bug in CartProvider useMemo

**File:** `packages/cart/react/src/provider.tsx`

**The bug (confirmed):**

```tsx
// line 116
const seededRef = useRef(false);

// lines 124-128 — fires after mount
useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;                                      // (A) mutates ref
    startTransition(() => dispatch({ type: 'setInitial', cart })); // (B) queue state update
}, [initialCart]);

// lines 249-256
const statusValue = useMemo(
    () => ({
        status: ...,
        cartReady: seededRef.current,   // reads ref at memo-compute time
    }),
    [state.pending, statusError],       // seededRef NOT in deps — memo never recomputes for ref change
);
```

`setInitial` in the queue reducer (`queue.ts:126`):
```ts
case 'setInitial':
    return { ...state, confirmed: action.cart };  // spreads state.pending unchanged — same [] reference
```

After `setInitial` dispatch and re-render:
- `state.pending` = same `[]` ref → useMemo dep unchanged
- `statusError` = same `null` → useMemo dep unchanged
- React returns cached memo value where `seededRef.current` was `false` at compute time
- `cartReady` stays `false` forever

**Only accidental rescue:** if the user dispatches a mutation before the cart is "ready" (impossible since `AddToCart` gates on `cartReady`), or if a mutation error occurs.

**Downstream impact:**
- `AddToCart`: `ready = selectedVariant?.availableForSale && cartReady && status !== 'mutating'` → always `false` → button always disabled → **can never add to cart from product page**
- `CartLines`: checks `!cartReady` → always shows skeleton → **cart page always appears empty**
- No test covers `cartReady` transitioning to `true` — missed entirely

**Verified: no tests catch this.** `provider.test.tsx` has no assertions on `useCartStatus().cartReady`.

**Fix — Option A (recommended, minimal blast radius):**

`packages/cart/react/src/provider.tsx`:
```diff
-const seededRef = useRef(false);
+const [seeded, setSeeded] = useState(false);

 useEffect(() => {
-    if (seededRef.current) return;
-    seededRef.current = true;
+    if (seeded) return;
+    setSeeded(true);
     startTransition(() => dispatch({ type: 'setInitial', cart: initialCart as Cart | null }));
-}, [initialCart]);
+}, [initialCart, seeded]);

 const statusValue = useMemo(
     () => ({
         status: ...,
-        cartReady: seededRef.current,
+        cartReady: seeded,
     }),
-    [state.pending, statusError],
+    [state.pending, statusError, seeded],
 );
```

**Fix — Option B (alternative):** Change `setInitial` in `queue.ts` to return `pending: [...state.pending]` — forces a new array reference so the memo recomputes. Simpler but feels hacky and doesn't make the intent explicit.

---

### FINDING-002 [HIGH — ROOT CAUSE OF SYMPTOM 5A] Infinite reload on multi-variant product pages

**Files:**
- `apps/storefront/src/components/products/product-actions-container.tsx:39-43`
- `apps/storefront/src/middleware/storefront.ts:192`

**Root cause:**

`product-actions-container.tsx` calls `useSelectedOptionInUrlParam()` from `@shopify/hydrogen-react`. This hook calls `window.history.replaceState({}, "", url)` on every mount and every option change. The state object `{}` has no Next.js router flags (`__NA`, `_N`).

Next.js 16 monkey-patches `window.history.replaceState`. When the state lacks Next.js flags, it triggers `ACTION_RESTORE` via `startTransition`, which fires a real RSC server fetch to the option-param URL.

The middleware (`storefront.ts:192`) calls `newUrl.searchParams.sort()` on all requests. If the option params are not already alphabetically ordered, the middleware issues a **301 redirect** to the sorted URL. The RSC fetch follows the redirect → App Router processes the payload → Suspense boundary may re-suspend → component remounts → `useSelectedOptionInUrlParam` fires again → **loop**.

**Why only "some" products:** Products with two or more options where the option names are NOT already in alphabetical order (e.g., "Size" before "Color" in Shopify admin). Single-variant or alphabetically-ordered-option products are unaffected.

**Fix direction:**
Remove `useSelectedOptionInUrlParam` from `product-actions-container.tsx`. Replace with Next.js-native URL update: call `router.replace(url, { scroll: false })` only on explicit user variant selection, not on mount.

---

### FINDING-003 [HIGH — ROOT CAUSE OF SYMPTOM 5B] Infinite HTTP redirect loop for some deleted products

**Files:**
- `apps/storefront/src/app/[domain]/[locale]/products/[handle]/page.tsx:182`
- `apps/storefront/src/api/shopify/redirects.ts:77-85`

**Root cause:**

`checkAndHandleRedirect` is called when a product is not found. `RedirectsApi` lowercases both `path` AND `target`:
```ts
path: path.toLowerCase(),
target: target.toLowerCase(),
```

If a Shopify admin created a redirect from `/products/My-Product` → `/products/my-product` (case-only difference), after lowercasing both become `/products/my-product`. The function then calls `redirect('/products/my-product')` → middleware adds locale/trailing slash → browser hits the same URL → product still not found → loop → `ERR_TOO_MANY_REDIRECTS`.

**Fix direction:** Before calling `redirect()`, compare normalized source and target — if they resolve to the same path, call `notFound()` instead.

---

### FINDING-004 [HIGH — ROOT CAUSE OF SYMPTOM 2 SECONDARY] `resolveContext()` outside try/catch in Server Action `run()`

**File:** `packages/cart/next/src/typed-actions.ts:209-222`

```ts
async function run(opts, mutation, idempotencyKey) {
    const ctx = await opts.resolveContext({ idempotencyKey }); // ← OUTSIDE try/catch
    try {
        const cartId = await ensureCartId(opts, ctx);
        const cart = await opts.kernel.mutate({ ...ctx, cartId }, mutation);
        return { ok: true, cart };
    } catch (error) {
        return mapError(opts, error);  // ← only for ensureCartId/mutate errors
    }
}
```

If `resolveContext()` throws (e.g., `CartProviderError`), the error **bubbles uncaught through the Server Action boundary** as an unhandled exception — NOT returned as `{ ok: false, reason: 'provider-error' }`. The client's `runMutation` try/catch would catch it as a network-style error, but the error surface is degraded (no typed reason code).

Currently not triggered because `x-shop-domain`/`x-locale` headers ARE forwarded to Server Actions via middleware. But any header-layer failure would cause uncaught explosions.

**Fix direction:** Wrap the full body of `run()` in the try/catch, not just the kernel calls.

---

### FINDING-005 [INTENTIONAL — ROOT CAUSE OF SYMPTOM 1] Add-to-cart on product cards is unimplemented

**Files:**
- `apps/storefront/src/components/product-card/primitives/product-card-cta.tsx`
- `apps/storefront/src/components/product-card/cta/float-pill.tsx`
- `apps/storefront/src/components/product-card/picker/float.tsx`
- `apps/storefront/src/components/product-card/picker/inline.tsx`
- `apps/storefront/src/components/product-card/picker/sheet.tsx`

**What was found:**

`AddToCart` is never rendered on listing pages. The product card CTA (`ProductCardCta`) resolves to `FloatPill`, whose `onAdd` callback explicitly contains a placeholder:

```ts
onAdd={() => {
    // Phase 3 intermediate state: fast-path falls back to opening
    // the picker. Real cart wiring lands when the orchestrator (Task
    // 3.12) plugs in the existing cart server action; the green dot
    // still telegraphs the fast-path intent.
    picker.setOpen(true);
}}
```

All three picker components (`float.tsx`, `inline.tsx`, `sheet.tsx`) have "Add to bag" `<button type="button">` elements with no `onClick` handler. The picker buttons are completely inert.

The variant data in the card context is complete (includes `availableForSale`, `id`, `price`) — it just isn't connected to any cart action.

**This is tracked as "Task 3.12" in the product card implementation.** Not a regression, not a bug — a known missing feature.

---

### FINDING-006 [LOW] CartPage `'use cache'; cacheLife('max')` — structurally safe but risky

**File:** `apps/storefront/src/app/[domain]/[locale]/cart/page.tsx`

`CartIsland` (per-request, reads cookie) is the **parent** of `CachedShell`, not inside it. `CartPage` with `'use cache'` emits a pure layout shell — all cart content is client components hydrated from `CartProvider` context. No cart data flows through the server-rendered `CartPage` RSC tree.

However, the annotation is a maintenance trap: any future server-side cart read added to `CartContent`/`CartSidebar`/`CartSummary` would silently serve stale user data from cache.

**Recommendation:** Remove `'use cache'` from `CartPage` — the page shell is already covered by layout caching.

---

### FINDING-007 [LOW] `resolveContext()` silently swallows DB errors

**File:** `apps/storefront/src/utils/request-context.ts:30-38`

All exceptions (including DB outages) are caught and return `null`. Only an OTel span event is emitted — nothing observable in production logs. Under a DB failure, every cart mutation would throw `CartProviderError` as an uncaught Server Action exception.

---

### FINDING-008 [LOW] `clientCache` in transport is an unbounded module-level Map

**File:** `apps/storefront/src/cart/transport.ts`

```ts
const clientCache = new Map<string, ShopifyApiClient>();
```

No eviction. Under high tenant/locale count, grows indefinitely per worker. Contributes to slow loading under memory pressure.

---

## Priority Matrix

| Finding | Severity | Symptoms addressed | Status |
|---|---|---|---|
| FINDING-001 `cartReady` useMemo bug | CRITICAL | 2 (add from product page), 3 (cart page empty) | Fix needed — `provider.tsx` ~lines 116, 124-128, 249-256 |
| FINDING-002 `useSelectedOptionInUrlParam` + param sort reload loop | HIGH | 5 (infinite reload) | Fix needed — remove hook, use `router.replace` |
| FINDING-003 Circular Shopify redirect loop | HIGH | 5 (infinite reload, some products) | Fix needed — guard in `checkAndHandleRedirect` |
| FINDING-004 `resolveContext()` outside try/catch | HIGH | Latent — uncaught SA exceptions on context failure | Fix needed — `typed-actions.ts` |
| FINDING-005 Card add-to-cart unimplemented (Task 3.12) | INTENTIONAL | 1 (add from cards) | Awaiting Task 3.12 implementation |
| FINDING-006 `CartPage` 'use cache' maintenance trap | LOW | None currently | Nice-to-fix |
| FINDING-007 Silent DB error swallowing | LOW | Observability | Nice-to-fix |
| FINDING-008 Unbounded client cache | LOW | Memory / slow loading | Nice-to-fix |

---

## Validation Steps (before fixes)

- [ ] Run `pnpm test --project @nordcom/cart-react` — confirm no test asserts `cartReady` becomes `true` (expected: passes currently because bug isn't tested)
- [ ] After FINDING-001 fix, verify `cartReady` becomes `true` on mount with no mutations
- [ ] Reproduce FINDING-002 on a product with non-alphabetical options, confirm network tab shows looping RSC fetches
- [ ] Verify FINDING-003 only affects `notFound` products with case-only Shopify redirects

---

## Agent Session Log

- 2026-05-28: Initial reconnaissance (main context), spec file created
- 2026-05-28: 5 parallel agents dispatched, all returned with findings
- FINDING-001 through FINDING-008 documented above

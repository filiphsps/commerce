# Cart System Triage — Tasks & Progress

See `spec.md` for full findings.

---

## Task 1 — Fix FINDING-001: `cartReady` permanently `false` ✅ DONE

**File:** `packages/cart/react/src/provider.tsx`  
**Changeset:** `.changeset/fix-cart-ready-stale-ref.md` (`@nordcom/cart-react` patch)

### What was wrong
`seededRef` (a React ref) was read inside a `useMemo` factory but not in the dependency array. After `setInitial` dispatch, `queueReducer` returned `{ ...state, confirmed: cart }` — spreading `state.pending` unchanged (same `[]` reference). `useMemo` deps didn't change → factory never reran → `cartReady` stuck at `false` forever.

### Fix applied
Replaced `useRef(false)` with `useState(false)`. `setSeeded(true)` schedules a real state update, React adds `seeded` to the memo deps, and the `cartReady: seeded` memo recomputes on next render.

```diff
-const seededRef = useRef(false);
+const [seeded, setSeeded] = useState(false);

 useEffect(() => {
-    if (seededRef.current) return;
-    seededRef.current = true;
+    if (seeded) return;
+    setSeeded(true);
     startTransition(() => dispatch({ type: 'setInitial', ... }));
-}, [initialCart]);
+}, [initialCart, seeded]);

 const statusValue = useMemo(() => ({
-    cartReady: seededRef.current,
+    cartReady: seeded,
-}), [state.pending, statusError]);
+}), [state.pending, statusError, seeded]);
```

### Tests added
`packages/cart/react/__tests__/provider.test.tsx`
- `cartReady becomes true after mount (no mutations required)`
- `cartReady is true even when initialCart is null`

### Good-to-know
- In jsdom/vitest, `renderHook` fires effects synchronously during render — so `cartReady` is already `true` after `renderHook()` returns, before any explicit `act()`. The intermediate "before effects" assertion was wrong to include.
- No existing test covered `cartReady`. The bug had been silently shipping.
- This is the root cause of both "can't add to cart from product page" AND "cart page always empty" — `AddToCart` gates on `cartReady` and `CartLines` shows skeleton until `cartReady` is true.

---

## Task 2 — Fix FINDING-002: Infinite reload on product pages (hydrogen hook) ✅ DONE

**Files changed:**
- `apps/storefront/src/components/products/product-actions-container.tsx` — removed `useSelectedOptionInUrlParam`, replaced with `useVariantUrlSync`
- `apps/storefront/src/hooks/useVariantUrlSync.ts` — new hook (server-only equivalent using Next.js router)

### What was wrong
`useSelectedOptionInUrlParam` from `@shopify/hydrogen-react` calls `window.history.replaceState({}, "", url)` with no Next.js router flags on every mount AND every option change. Next.js 16 monkey-patches `replaceState`: seeing no `__NA`/`_N` flags, it fires `ACTION_RESTORE` → RSC fetch. The middleware sorts search params alphabetically → 301 redirect if params weren't already sorted → Suspense re-suspend on redirect → component remounts → hook fires again → loop.

Affects only multi-variant products where option names aren't already alphabetically ordered (e.g., "Size" before "Color").

### Fix applied
Extracted `useVariantUrlSync(options)` hook that:
- Skips the initial mount (no URL update on first render)
- Calls `router.replace(url, { scroll: false })` only when options actually change
- Pre-sorts params alphabetically before the replace → middleware sees already-sorted params → no 301 redirect → no loop

### Tests added
`apps/storefront/src/hooks/useVariantUrlSync.test.ts`
- `does NOT call router.replace on initial mount`
- `calls router.replace when options change after mount`
- `sorts params alphabetically to prevent middleware 301 redirect`
- `does NOT call router.replace when options are unchanged`

### Good-to-know
- Hydrogen hooks are designed for Hydrogen's own router, not Next.js App Router. `useSelectedOptionInUrlParam` specifically is incompatible with Next.js 16's patched `replaceState`.
- The middleware's `searchParams.sort()` is the secondary trigger. Sorting before `router.replace` is the correct fix on the client side, NOT removing the sort from the middleware (the sort exists for other valid reasons).
- The new hook lives in `src/hooks/` (not co-located with the component) because it's reusable and independently testable.

---

## Task 3 — Fix FINDING-003: Circular Shopify redirect loop ✅ DONE

**File:** `apps/storefront/src/utils/redirect.ts`

### What was wrong
`RedirectsApi` lowercases both `path` and `target`. A Shopify admin redirect like `/products/My-Product → /products/my-product` (case-only difference) normalizes both sides to `/products/my-product`. `checkAndHandleRedirect` then calls `redirect('/products/my-product')` → middleware adds locale/trailing slash → browser hits the same normalized URL → product still not found → loop → `ERR_TOO_MANY_REDIRECTS` after ~20 cycles.

### Fix applied
Added a normalize-and-compare guard before calling `redirect()`. If normalized target equals normalized source, call `notFound()` instead:

```ts
const normalize = (p: string) => p.toLowerCase().replace(/\/+$/, '');
if (normalize(target) === normalize(path)) {
    notFound();
}
```

### Tests added
`apps/storefront/src/utils/redirect.test.ts` (new file)
- `does NOT redirect when no target is found`
- `calls redirect() when a valid different target is found`
- `calls notFound() (not redirect) when normalized target equals normalized source`
- `calls notFound() when target matches source regardless of trailing slash`

### Good-to-know
- `notFound()` in Next.js throws internally — tests must `await expect(...).rejects.toThrow()`, not just call the function and assert.
- Vitest mocks are NOT automatically cleared between tests — always add `beforeEach(() => vi.clearAllMocks())` when multiple tests use the same mock functions.
- Only affects pages for deleted/renamed products with case-mismatch Shopify redirects. Rare but causes a hard browser error when hit.

---

## Task 4 — Fix FINDING-004: `resolveContext()` outside try/catch ✅ DONE

**File:** `packages/cart/next/src/typed-actions.ts`  
**Changeset:** `.changeset/fix-typed-actions-context-error.md` (`@nordcom/cart-next` patch)

### What was wrong
`resolveContext()` was called BEFORE the try/catch in `run()`. If it threw (e.g., `CartProviderError` when middleware headers were missing, or a DB error in `getRequestContext`), the exception escaped through the Server Action boundary as an unhandled error — not returned as `{ ok: false, reason: 'provider-error' }`. The client's `runMutation` try/catch would catch it as a raw network-style error with no typed reason code.

### Fix applied
One-line move: `const ctx = await opts.resolveContext(...)` moved inside the try block.

```diff
 async function run(opts, mutation, idempotencyKey) {
+    try {
         const ctx = await opts.resolveContext({ idempotencyKey });
-    try {
         const cartId = await ensureCartId(opts, ctx);
```

### Tests added
`packages/cart/next/__tests__/typed-actions.test.ts`
- `returns ok:false provider-error when resolveContext throws — does not let the error escape uncaught`

### Good-to-know
- Not currently triggered in production (middleware correctly sets `x-shop-domain`/`x-locale` for POST/Server Action requests). This is a defensive fix for any future header-layer failure.
- `mapError` handles the thrown `CartProviderError` via the generic fallback path (name doesn't match `CartUserError` or `CartNotFoundError` → returns `reason: 'provider-error'`).

---

## Final Test Count

| Package | Tests | Status |
|---|---|---|
| `@nordcom/cart-react` | 25 | ✅ all pass |
| `@nordcom/cart-next` | 22 | ✅ all pass |
| `@nordcom/commerce-storefront` | 828 | ✅ all pass |
| **Total** | **875** | **✅ zero failures** |

---

## Remaining (out of scope for this session)

- **Card add-to-cart (FINDING-005):** Intentionally unimplemented — tracked as "Task 3.12" in the product card backlog.
- **CartPage `'use cache'` (FINDING-006):** Structurally safe now; maintenance trap only.
- **Silent DB error swallowing in `getRequestContext` (FINDING-007):** Observability improvement, not a functional bug.
- **Unbounded `clientCache` map in transport (FINDING-008):** Memory concern under high tenant/locale count.

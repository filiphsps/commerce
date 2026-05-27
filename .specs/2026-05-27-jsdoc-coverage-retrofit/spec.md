# JSDoc Coverage Retrofit

**Status:** Draft
**Created:** 2026-05-27
**Owner:** Filiph Sandström

## Goal

Backfill JSDoc on every hand-written function and React component across `packages/*` and `apps/*` (except `apps/docs`), reaching ~100% coverage on the in-scope file set in a single retrofit campaign. CLAUDE.md already mandates JSDoc on every exported and internal function/component — this spec executes the retrofit and defines the per-PR quality bar.

## Non-goals

- No CI enforcement (no Biome rule, no GitHub Actions check, no TypeDoc `--validation.notDocumented`).
- No ESLint adoption alongside Biome.
- No `@public`/`@internal`/`@alpha` visibility tagging — tier is structural.
- No `apps/docs` retrofit (the docs site renders the docs; deferred).
- No `packages/react-payment-brand-icons` retrofit (codegen output; fix generator template instead).
- No Next.js framework files (`page.tsx`, `layout.tsx`, `error.tsx`, `route.ts`, `middleware.ts`, `instrumentation.ts`, etc.) — Next's contract documents them; restating adds no value.
- No test file JSDoc — `it('should…')` blocks self-document.
- No rewrite of existing JSDoc that violates rules (cleanup is a follow-up spec).
- No type-alias docs for internal-tier shape aliases.

## Open risk accepted

Without CI enforcement, new code added during and after this campaign will drift back toward ~80% coverage within months unless reviewers (human + Claude in PR loop) hold the line. CLAUDE.md does the heavy lifting; the rest is discipline.

## Scope

### In scope (the "where")

- All `*.ts` / `*.tsx` files under `packages/*/src/**` (excluding `react-payment-brand-icons`).
- All `*.ts` / `*.tsx` files under `apps/admin/**`, `apps/storefront/**`, `apps/landing/**`.

### Out of scope (the "where")

- `packages/react-payment-brand-icons/` — 492 auto-generated icon components.
- `apps/docs/` — the documentation site itself.
- Generated files: `packages/cms/src/types/payload-types.ts`, `*.d.ts`, GraphQL codegen output.
- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`.
- Storybook story files: `*.stories.tsx`.
- Config / build files at repo or package root (`vite.config.ts`, `vitest.config.ts`, `next.config.ts`, `tailwind.config.ts`, `instrumentation-client.ts` config shims, etc.).
- **Next.js framework files.** All convention-named files Next.js invokes by contract: `page.tsx`/`page.ts`, `layout.tsx`/`layout.ts`, `template.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `default.tsx`, `route.ts`/`route.tsx`, `middleware.ts`, `instrumentation.ts`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`, `twitter-image.tsx`. The framework's contract documents these; restating it adds no value. Includes any `generateMetadata` / `generateStaticParams` co-located in those files.

### In scope (the "what")

- Every named function declaration (`function foo() {}`).
- Every exported arrow `const` that resolves to a function or React component.
- Every React component (named function returning JSX, or arrow assigned to a const).
- Every class and class method (public + protected).
- TypeScript types/interfaces/enums when re-exported from the package barrel.

### Out of scope (the "what")

- Anonymous inline callbacks (`.map((x) => x.id)`, inline event handlers).
- Local `const` arrows used as helpers inside a function body.
- Anything inside an excluded framework file (see "Out of scope (the where)" above) — including any helper functions co-located there.
- Internal-tier type aliases that are pure shape (`type X = { a: string; b: number }`).

## Tier classification

Two tiers per CLAUDE.md, applied via a deterministic structural rule.

### Tier 1 — Public API (full TSDoc + `@example`)

**Rule:** symbol is re-exported from the package's root barrel (`packages/<name>/src/index.ts` or `index.tsx`) **OR** from any sub-path declared in `package.json#exports` (e.g., `@nordcom/cart-next/server`).

**Content requirements:**
- 1–2 sentence purpose (intent, not implementation).
- `@param <name>` with semantic description for every parameter.
- `@returns` describing what comes back (skip only for `void`).
- `@throws` for every error class actually thrown; reference `@nordcom/commerce-errors` classes by name.
- `@example` block with a realistic call site. For React components, an `@example` showing typical JSX usage.
- `@see` only when there's a genuinely related symbol worth pointing at.

### Tier 2 — Internal (purpose + contract)

**Rule:** in-scope and not Tier 1. Includes all package internals (`packages/<name>/src/lib/foo.ts` not re-exported) and all app code in `apps/*`.

**Content requirements:**
- 1-line purpose.
- `@param <name>` per parameter with semantic description.
- `@returns` when non-`void`.
- `@throws` when applicable.
- No `@example` required.

### Edge case rules

- React components in apps default to Tier 2 even if large — apps don't publish.
- Server actions (`'use server'` exports living outside framework files): Tier 2 always, but `@throws` mandatory since they cross the trust boundary.
- React hooks (`useFoo`): same tier as their surrounding context.
- Type-only exports: documented when Tier 1; when Tier 2, only documented if non-trivial.

## Templates (quality bar)

### Tier 1 — Public API function

```ts
/**
 * Resolve a shop record by hostname, falling back to wildcard tenants when no exact match exists.
 *
 * @param hostname - Fully-qualified request hostname (no port, no scheme).
 * @param options - Optional resolution overrides. `bypassCache` forces a fresh DB read; `locale` narrows the returned shop's locale list.
 * @returns The matched shop record, or `null` when no tenant claims the hostname.
 * @throws {UnknownShopError} When `options.requireExact` is set and no exact match exists.
 * @throws {InvalidHostnameError} When `hostname` is empty or fails URL parsing.
 * @example
 * ```ts
 * const shop = await resolveShopByHostname('shop.example.com');
 * if (!shop) return notFound();
 * ```
 */
export async function resolveShopByHostname(hostname: string, options?: ResolveOptions): Promise<Shop | null> { … }
```

### Tier 1 — Public React component

```tsx
/**
 * Renders a product card with image, title, price, and add-to-cart action.
 *
 * @param props.product - Shopify product handle resolved against the active shop.
 * @param props.priority - Set on the LCP-eligible card on a page. Defaults to `false`.
 * @returns A server-rendered card element.
 * @example
 * ```tsx
 * <ProductCard product={product} priority={index === 0} />
 * ```
 */
export function ProductCard({ product, priority = false }: ProductCardProps) { … }
```

### Tier 2 — Internal function

```ts
/**
 * Builds the Apollo cache key for a Shopify product variant.
 *
 * @param productId - Shopify GID.
 * @param variantId - Shopify GID.
 * @returns Cache key string formatted as `product:<pid>:variant:<vid>`.
 */
function variantCacheKey(productId: string, variantId: string): string { … }
```

### Tier 2 — Internal React component

```tsx
/**
 * Wraps a product image with a fixed-aspect-ratio container so layout stays stable while next/image hydrates.
 *
 * @param props.src - Resolved image URL.
 * @param props.alt - Alt text from the product CMS entry.
 */
export function ProductImageFrame({ src, alt }: ProductImageFrameProps) { … }
```

### Tier 2 — Server action (not in a framework file)

```ts
/**
 * Adds a single variant to the active cart. Mutates server-side cart state and revalidates the cart route.
 *
 * @param formData - Form payload; expects `variantId` and optional `quantity` (default 1).
 * @throws {CartFullError} When the cart already contains the per-tenant maximum line count.
 * @throws {OutOfStockError} When Shopify reports zero available inventory at submit time.
 */
export async function addToCartAction(formData: FormData): Promise<void> { … }
```

### Anti-patterns (reviewer rejects)

- Restating the code (`"Adds a variant to the cart."` for a fn literally named `addToCart`).
- `@param productId - The product ID.` (types say "string", names say "productId" — description must add meaning).
- Generic `@returns Promise<void>` (types say that; skip the tag).
- Section headers (`// === Helpers ===`), task notes (`// added for #1234`), or implementation explanations.
- Multi-paragraph docstrings on internal functions.
- Documenting trivial type aliases.

## Execution model

### Stage 1 — Generator subagent (one per package)

Spawned with `general-purpose` subagent type. Each generator owns one package end-to-end.

**Precondition.** Before any edits, the generator runs `pnpm --filter <package-name> typecheck` and `pnpm --filter <package-name> lint` on a clean tree. If either fails on the baseline, abort and surface the failure — fixing pre-existing issues is out of scope.

Steps:
1. `git checkout -b docs/jsdoc-<package-name>` from `master`.
2. Read `src/index.ts` (or root barrel) and `package.json#exports` → build the set of public symbol names.
3. Enumerate in-scope files via glob.
4. For each file: read in full; for each in-scope symbol, classify tier, insert JSDoc above using `Edit` (never `Write`).
5. Run `pnpm --filter <package-name> typecheck`.
6. Run `pnpm --filter <package-name> lint --write` to absorb any Biome formatting drift. Diff inspection: only JSDoc insertions and whitespace changes; any other diff means the generator broke something — abort and surface.
7. Generate a changeset (`pnpm changeset`, `patch` level) only if the package isn't in `.changeset/config.json`'s `ignore` list. Summary: "Backfill JSDoc on public/internal symbols."
8. Commit: `docs(<package-scope>): backfill jsdoc on functions and components.`
9. Push branch, open PR. PR body lists: Tier-1 symbol count, Tier-2 symbol count, files touched.

Each subagent runs in its own git worktree (per `superpowers:using-git-worktrees`) to keep the main checkout free.

### Stage 2 — Reviewer subagent (per PR)

Spawned with `code-reviewer` subagent type after the generator opens the PR.

Reviewer flags as blockers:
- JSDoc blocks that restate the code or types instead of describing intent.
- Missing `@throws` for thrown errors. Mechanic: `rg -n 'throw new \w+Error' <file>` per modified file; cross-check against `@throws` tags.
- Tier mis-classification (e.g., a symbol re-exported from `index.ts` documented at Tier 2).
- `@param` descriptions that just repeat the param name or its type.
- Any non-JSDoc code changes — this PR must be docs-only.

If the reviewer raises blockers, the generator is re-spawned with the review as input. Loop until clean, then the human merges.

### Failure modes

- **Generator typecheck fails after edits** → generator fixes or reverts before committing.
- **Generator runs out of context mid-package** → resume from the last committed file using `git diff`.
- **Reviewer flags >20 issues** → too noisy; abort, narrow generator scope to a subdirectory and retry.

## Rollout

### Wave order

Bottom-of-dep-graph first; packages within a wave run as concurrent subagents in separate worktrees; waves run sequentially.

| Wave | Package                              | Files | Existing |
|------|--------------------------------------|------:|---------:|
| 1    | `packages/errors`                    |     5 |       0% |
| 1    | `packages/utils`                     |     6 |      16% |
| 2    | `packages/db`                        |    21 |      19% |
| 2    | `packages/tagtree`                   |    31 |       3% |
| 2    | `packages/shopify-graphql`           |     7 |      14% |
| 2    | `packages/cart/core`                 |    19 |      73% |
| 3    | `packages/shopify-html`              |     7 |      28% |
| 3    | `packages/marketing-common`          |     4 |       0% |
| 3    | `packages/test-mongo`                |    19 |      68% |
| 3    | `packages/cart/shopify`              |    10 |      50% |
| 3    | `packages/cart/react`                |    20 |      35% |
| 4    | `packages/cart/next`                 |    10 |      60% |
| 4    | `packages/cms`                       |   126 |      33% |
| 5    | `apps/admin`                         |    82 |      20% |
| 5    | `apps/storefront`                    |   276 |      25% |
| 6    | `apps/landing`                       |    18 |       0% |
| —    | `apps/docs`                          |    33 |      51% (excluded) |
| —    | `packages/react-payment-brand-icons` | 492   |       0% (excluded) |

**In-scope total: 661 files across 16 packages/apps** (after excluding 142 Next.js framework files from the three apps: admin -75, storefront -54, landing -13).

### Split rule for `apps/storefront`

276 in-scope files → split into sub-PRs by top-level `src/` directory: `src/components/**`, `src/lib/**`, `src/hooks/**`, and remaining non-framework files under `src/app/**` (e.g., co-located client components and `actions.ts` server-action files). Each sub-PR independently reviewable; same tier rules.

### Calibration gate after wave 1

Before wave 2 starts, review wave 1's two PRs together. If reviewer feedback reveals a template gap, update the Templates section above (this spec is the source of truth) before wave 2 fires.

### Estimated cadence

~6 waves total. With parallel execution within waves, full retrofit fits in 5–7 working sessions.

## Deferred decisions

Revisit only if signal warrants:

- Should public-tier `@example` blocks be type-checked (e.g., `typescript-docs-verifier`)? Defer until a stale example bites us in review.
- Should TypeDoc generate per-package docs pages from the new JSDoc? `apps/docs` has TypeDoc plumbing; decide after wave 4 (cms) lands.
- Should we autopublish a "missing JSDoc" warning report on PRs? Defer; revisit if rot is visible in 3 months.
- Cleanup of existing low-quality JSDoc blocks — separate spec.
- JSDoc on non-barrel-exported types/interfaces/enums — defer.

## Success criteria

- All 16 in-scope packages/apps reach 100% JSDoc coverage on Tier-1 and Tier-2 symbols per the rules above.
- Per-wave PRs land in the order specified; no wave starts before the prior wave merges.
- No code changes in any PR beyond JSDoc insertion plus Biome formatter-induced whitespace.
- CLAUDE.md remains the policy source of truth; no new lint rule introduced.

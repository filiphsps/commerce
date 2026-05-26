# CLAUDE.md

<!-- cspell:ignore colour behaviour organisation cancelled analyse -->

## Toolchain corrections

LLM defaults that would otherwise be wrong here:

-   **Biome only** for lint + format. No ESLint, no Prettier.
-   **`pnpm build:packages` before lint/typecheck/test in a fresh checkout** — apps import workspace packages from built `dist/`, not source.
-   Top-level scripts run through `dotenv -c -- turbo …`; `.env` / `.env.local` load automatically. Don't prefix env vars manually.
-   **`pnpm cms:gen`** regenerates CMS action types after touching CMS manifests. CI gate: `pnpm cms:gen:check`.
-   **Storefront GraphQL is `gql.tada`** — `graphql()` from `@nordcom/commerce-shopify-graphql/graphql`, not Apollo's `gql`.
-   **Call `mcp__next-devtools__init` (`next-devtools` mcp) first** when starting Next.js work.

## Spec, plan & task paths

Applies to every spec-driven workflow — superpowers (`writing-plans`, `executing-plans`, `brainstorming`), `claude-mem:make-plan`/`do`, and any other tool that emits specs, plans, or task lists.

Group artifacts per topic under `.specs/<YYYY-MM-DD-kebab-slug>/{spec,plan,tasks}.md` — e.g. `.specs/2026-05-26-storefront-stale-times/spec.md`, `…/plan.md`, `…/tasks.md`. Never write specs/plans/tasks to `.claude/`, the tool's default location, or the project root.

## Architecture (non-obvious only)

-   **Multi-tenant by hostname.** Middleware resolves hostname → shop and rewrites to `/[domain]/[locale]/…`. The App Router never sees an un-tenanted request. New tenant = row in `shops` MongoDB collection; no redeploy.
-   **Tenant context is never implicit.** Every Shopify call goes through `ShopifyApolloApiClient({ shop, locale })`. New data-fetching helpers must take `{ shop, locale }` explicitly.
-   **Locale fallback:** `request locale → shop default → platform default`. Locales live on the shop record, not a global list.

## Coding conventions

-   **`noUncheckedIndexedAccess: true`** — index access is `T | undefined`. Don't paper over with `!`.
-   **Trailing slashes** on internal links (`trailingSlash: true`).
-   **Server Components by default.** Add `'use client'` only when needed (hooks, event handlers, browser APIs). Never import a `server-only` module — or any file that transitively does — from a Client Component.
-   **Async APIs in Next.js 16.** `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are promises. `await` in async functions; `React.use()` in sync.
-   Provider tokens guarded with `experimental_taintUniqueValue` — preserve that.
-   **Throw via `@nordcom/commerce-errors`**, never `new Error(...)`. If no class fits, add one (plus `*ErrorKind` and a `getErrorFromCode` case) in the errors package.
-   **Comments must earn their place.** Document the WHY — hidden constraints, workarounds, surprising behavior. If the code already says it, no comment. No section headers, no task notes, no restatements.
-   **JSDoc on every non-component function.** Required for all exported and internal functions except React components. Block must include purpose plus `@param`, `@returns`, and `@throws` where applicable. Same no-fluff rule applies inside the block — describe intent and contract, not implementation.
-   **Root cause before symptom.** Don't revert versions, return empty arrays, or disable features as a first-guess fix — especially for Next.js cache/PPR, build-tool errors, OIDC, or Shopify GraphQL field mismatches.
-   **No unused variables, parameters, imports, or destructured props.** Delete them — don't suppress with a leading underscore (`const _params = …`, `function f(_unused)`), `void` casts, or `// biome-ignore`. If a destructure exists only to drop a key, remove the destructure entirely. The only exception is destructured rest patterns where the named keys are genuinely discarded to build the rest object (`const { skip, ...rest } = props`).
-   **American English** — `color`, `behavior`, `organization`, `canceled`, `analyze`.

## Git commits

-   **Conventional Commits with scope** — `<type>(<scope>): <subject>.`. Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `build`. Imperative subject, lowercase, trailing period.
-   **Body explains the WHY**, not the WHAT — motivation, hidden context, trade-offs, breaking-change notes. Skip the body entirely if subject + diff are self-explanatory. Per item: omit anything the diff already makes obvious.

## Changesets

Touching any package **not** in `.changeset/config.json`'s `ignore` list requires a changeset (`pnpm changeset`). Pick the level per semver: `patch` for bugfix/internal-only, `minor` for additive API, `major` for breaking change. One changeset per logical change. Summary follows the same WHY-only rule as commit bodies.

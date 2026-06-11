# CLAUDE.md

<!-- cspell:ignore colour behaviour organisation cancelled analyse -->

## Toolchain corrections

LLM defaults that would otherwise be wrong here:

-   **Biome only** for lint + format. No ESLint, no Prettier.
-   **`pnpm build:packages` before lint/typecheck/test in a fresh checkout** — apps import workspace packages from built `dist/`, not source.
-   Top-level scripts run through `dotenv -c -- turbo …`; `.env` / `.env.local` load automatically. Don't prefix env vars manually.
-   **Use `pnpm <script>` whenever a `package.json` script exists** — `pnpm test`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:e2e`, etc. Extra args forward through: `pnpm test --project @nordcom/commerce-storefront` runs `dotenv -c -- vitest run --coverage --project @nordcom/commerce-storefront`. Don't hand-roll `pnpm dotenv -c -- vitest run …` or `pnpm turbo run build …`. If a script doesn't forward extra args, fix the script in `package.json`, don't bypass it.
-   **`pnpm cms:gen`** regenerates CMS action types after touching CMS manifests. CI gate: `pnpm cms:gen:check`.
-   **Storefront GraphQL is `gql.tada`** — `graphql()` from `@nordcom/commerce-shopify-graphql/graphql`, not Apollo's `gql`.
-   **Call `mcp__next-devtools__init` (`next-devtools` mcp) first** when starting Next.js work.

## Code intelligence

Prefer LSP over `Grep`/`Read` for navigation — faster, precise, no whole-file reads.

-   **Find a symbol by name → `lsp-symbols` MCP** (`find_symbol`, `find_references`). The built-in LSP tool has **no `query` param**, so its `workspaceSymbol` always returns nothing ([claude-code#30948](https://github.com/anthropics/claude-code/issues/30948)). The `lsp-symbols` server fills that gap; opt-in per machine — see `.claude/mcp/README.md`. If it isn't connected, fall back to `Grep` for the name, then point position-based LSP ops at the hit.
-   The remaining built-in LSP ops are position-based (`filePath` + `line` + `character`):
    -   **`findReferences`** for every usage across the repo.
    -   **`goToDefinition` / `goToImplementation`** to jump to source.
    -   **`hover`** for type info without opening the file.
    -   **`documentSymbol`** to list a file's symbols (works; it's file-scoped).
-   **Check LSP diagnostics after writing or editing code** and fix errors before moving on.

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
-   **JSDoc on every function and component.** Required for all exported and internal functions — including React components. Block must include purpose plus `@param`, `@returns`, and `@throws` where applicable. Same no-fluff rule applies inside the block — describe intent and contract, not implementation.
-   **Root cause before symptom.** Don't revert versions, return empty arrays, or disable features as a first-guess fix — especially for Next.js cache/PPR, build-tool errors, OIDC, or Shopify GraphQL field mismatches.
-   **No unused variables, parameters, imports, or destructured props.** Delete them — don't suppress with a leading underscore (`const _params = …`, `function f(_unused)`), `void` casts, or `// biome-ignore`. If a destructure exists only to drop a key, remove the destructure entirely. The only exception is destructured rest patterns where the named keys are genuinely discarded to build the rest object (`const { skip, ...rest } = props`).
-   **American English** — `color`, `behavior`, `organization`, `canceled`, `analyze`.

## Git commits

-   **Conventional Commits with scope** — `<type>(<scope>): <subject>.`. Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`, `build`. Imperative subject, lowercase, trailing period.
-   **Body explains the WHY**, not the WHAT — motivation, hidden context, trade-offs, breaking-change notes. Skip the body entirely if subject + diff are self-explanatory. Per item: omit anything the diff already makes obvious.
-   **Never merge — always rebase.** No merge commits on any branch. Integrate via `git rebase` (or `git pull --rebase`). If a PR can't fast-forward, rebase the branch onto the target before merging.
-   **Prefer amend over fixup commits.** When iterating on the most recent commit (review feedback, typo, missed file), `git commit --amend` rather than stacking a `fixup!` / follow-up commit. Only create a new commit when the change is logically distinct or the prior commit is already pushed and shared.

## Changesets

Touching any package **not** in `.changeset/config.json`'s `ignore` list requires a changeset (`pnpm changeset`). Pick the level per semver: `patch` for bugfix/internal-only, `minor` for additive API, `major` for breaking change. One changeset per logical change. Summary follows the same WHY-only rule as commit bodies.

## Agent skills

### Issue tracker

GitHub Issues at `filiphsps/commerce`, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` at the repo root (optional glossary), with historical decisions in `.specs/<YYYY-MM-DD-kebab-slug>/`. No ADRs. See `docs/agents/domain.md`.

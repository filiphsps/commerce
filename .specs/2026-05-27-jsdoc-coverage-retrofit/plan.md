# JSDoc Coverage Retrofit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backfill JSDoc on 661 in-scope source files across 16 packages/apps via wave-ordered subagent dispatches with a code-reviewer agent gating each PR.

**Architecture:** This plan is an orchestration plan, not a code-writing plan. The orchestrator (Claude) builds two prompt templates once (Phase 0), then dispatches per-package generator subagents in waves. Each generator runs in its own git worktree, opens one PR per package. A code-reviewer subagent reviews each PR before merge. Waves are sequential; packages within a wave run in parallel.

**Tech Stack:** pnpm + turbo monorepo, Biome (lint/format), Changesets, git worktrees, `Agent` tool subagents (`general-purpose` type for both generators and reviewers; the reviewer role is conveyed entirely through the reviewer-prompt.md template), `gh` CLI for PRs.

**Spec:** [`.specs/2026-05-27-jsdoc-coverage-retrofit/spec.md`](./spec.md) — single source of truth for tier rules, templates, anti-patterns, and per-package recipe.

---

## File structure

This plan produces:

- `.specs/2026-05-27-jsdoc-coverage-retrofit/generator-prompt.md` — parameterized prompt template the orchestrator hands to every generator subagent.
- `.specs/2026-05-27-jsdoc-coverage-retrofit/reviewer-prompt.md` — parameterized prompt template the orchestrator hands to every reviewer subagent.
- `.specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md` — running log the orchestrator appends to as each wave completes (timestamps, PR URLs, calibration findings).

No application code is produced by this plan. All code-touching work happens inside subagent-driven PRs against `master`.

---

## Phase 0 — Build orchestration artifacts

Produces the two reusable prompt templates and the wave log.

### Task 1: Write the generator prompt template

**Files:**
- Create: `.specs/2026-05-27-jsdoc-coverage-retrofit/generator-prompt.md`

- [ ] **Step 1: Create the file with the parameterized template**

```markdown
# JSDoc Generator — `<PACKAGE_PATH>`

You are the JSDoc generator subagent for `<PACKAGE_PATH>`. Read the spec at `.specs/2026-05-27-jsdoc-coverage-retrofit/spec.md` in full before doing anything else. It defines the tier rules, content requirements, templates, and anti-patterns you must follow. This prompt does NOT restate them — it parameterizes your run.

## Run parameters

- Package path: `<PACKAGE_PATH>` (e.g., `packages/errors`, `apps/admin`)
- Package npm name: `<PACKAGE_NPM_NAME>` (the `name` field from `<PACKAGE_PATH>/package.json`)
- Worktree path: `<WORKTREE_PATH>` (already created by orchestrator; cd here before any git ops)
- Branch name: `docs/jsdoc-<PACKAGE_SLUG>`
- Commit scope: `<COMMIT_SCOPE>` (e.g., `errors`, `cart-core`, `admin`)

## Precondition (mandatory)

Inside the worktree:

1. Confirm clean working tree: `git status --porcelain` → must be empty.
2. Confirm on the right branch: `git rev-parse --abbrev-ref HEAD` → must equal `docs/jsdoc-<PACKAGE_SLUG>`.
3. Baseline typecheck: `pnpm --filter <PACKAGE_NPM_NAME> typecheck`. Must pass.
4. Baseline lint: `pnpm --filter <PACKAGE_NPM_NAME> lint`. Must pass.

If any precondition fails, abort immediately and report the failure. Do not edit anything. Fixing pre-existing issues is out of scope for this campaign.

## Steps (follow spec § Execution model § Stage 1)

1. Read `<PACKAGE_PATH>/src/index.ts` (or `index.tsx`, whichever exists) and `<PACKAGE_PATH>/package.json#exports`. Build the Tier-1 symbol set from every name re-exported there.
2. Enumerate in-scope files via the spec's "In scope (the where)" rule. Exclude per the spec's "Out of scope (the where)" rule — pay particular attention to the Next.js framework file list for app packages.
3. For each in-scope file, in deterministic order (alphabetical by path):
   - Read the file in full.
   - For each in-scope symbol (per spec § "In scope (the what)"), classify tier using the Tier-1 rule (re-exported from barrel or `exports` map → Tier 1; else → Tier 2).
   - Insert the JSDoc block above the symbol using `Edit` (never `Write`). Match the spec's template for the symbol's tier and shape (function / React component / server action / class / etc.).
   - If the symbol already has a JSDoc block, leave it alone — cleanup of existing blocks is out of scope.
4. After all files edited:
   - Run `pnpm --filter <PACKAGE_NPM_NAME> typecheck`. Must pass. If it fails, the cause is your edits — fix or revert before continuing.
   - Run `pnpm --filter <PACKAGE_NPM_NAME> lint --write` to absorb Biome formatting drift.
   - Run `git diff --stat` and visually confirm: only `*.ts` / `*.tsx` files under `<PACKAGE_PATH>/src/`, no code changes other than JSDoc insertions and whitespace. If you see any non-JSDoc line change, abort and surface the diff.
5. Generate a changeset only if `<PACKAGE_NPM_NAME>` is NOT in `.changeset/config.json#ignore`:
   - Run `pnpm changeset` interactively-equivalent: write `.changeset/<random-slug>.md` directly with frontmatter `'<PACKAGE_NPM_NAME>': patch` and body `Backfill JSDoc on public/internal symbols.`
6. Stage and commit:
   ```bash
   git add <PACKAGE_PATH>/ .changeset/
   git commit -m "docs(<COMMIT_SCOPE>): backfill jsdoc on functions and components."
   ```
7. Push: `git push -u origin docs/jsdoc-<PACKAGE_SLUG>`
8. Open PR with `gh pr create`:
   - Title: `docs(<COMMIT_SCOPE>): backfill jsdoc on functions and components`
   - Body template:
     ```markdown
     ## Summary
     Adds JSDoc to all in-scope symbols in `<PACKAGE_PATH>` per [spec](.specs/2026-05-27-jsdoc-coverage-retrofit/spec.md).

     ## Counts
     - Tier-1 symbols documented: <N>
     - Tier-2 symbols documented: <N>
     - Files touched: <N>

     ## Verification
     - [x] `pnpm --filter <PACKAGE_NPM_NAME> typecheck` passes
     - [x] `pnpm --filter <PACKAGE_NPM_NAME> lint` passes
     - [x] Diff is JSDoc-only (no logic changes)
     ```
9. Report PR URL back to the orchestrator.

## Failure handling

- Context exhaustion mid-package: commit the work done so far on the branch, push, report which file you stopped at. The orchestrator will resume.
- Typecheck breaks after your edits: identify the edit, fix or revert it. Do not commit until typecheck is green.
- More than 20 distinct files where you're unsure how to classify a symbol: stop and ask the orchestrator before continuing.
```

- [ ] **Step 2: Verify the file was written**

Run: `wc -l .specs/2026-05-27-jsdoc-coverage-retrofit/generator-prompt.md`
Expected: ~85 lines.

### Task 2: Write the reviewer prompt template

**Files:**
- Create: `.specs/2026-05-27-jsdoc-coverage-retrofit/reviewer-prompt.md`

- [ ] **Step 1: Create the file with the parameterized template**

```markdown
# JSDoc Reviewer — PR `<PR_URL>`

You are the code-reviewer subagent for a JSDoc retrofit PR. Read the spec at `.specs/2026-05-27-jsdoc-coverage-retrofit/spec.md` in full before doing anything else. It defines the tier rules and anti-patterns you must enforce.

## Run parameters

- PR URL: `<PR_URL>`
- Package path: `<PACKAGE_PATH>`
- Generator branch: `docs/jsdoc-<PACKAGE_SLUG>`

## Your job

Fetch the PR diff and identify blockers from the five categories below. Report findings as a structured list. If no blockers, return `LGTM`.

## Blocker categories (per spec § Execution model § Stage 2)

1. **Restatement.** Any JSDoc purpose line that just paraphrases the function/component name or types. The purpose must describe intent or behavior the signature does not.
2. **Missing `@throws`.** For every modified file, run `rg -n 'throw new \w+Error' <file>` inside the file. Every distinct error class thrown must appear in the corresponding symbol's `@throws` tags. Missing tags are blockers. Spurious tags (no actual throw) are also blockers.
3. **Tier mis-classification.** Re-derive the Tier-1 set by reading `<PACKAGE_PATH>/src/index.ts` (or `index.tsx`) and `<PACKAGE_PATH>/package.json#exports`. Any Tier-1 symbol documented at Tier 2 (no `@example`, no full `@returns`) is a blocker. Any Tier-2 symbol burdened with unnecessary `@example` is a soft blocker — flag but don't block on first iteration.
4. **Param description that just repeats name or type.** `@param productId - The product ID.` is a blocker. `@param productId - Shopify GID for the parent product.` is fine.
5. **Non-JSDoc code change.** Run `git diff --merge-base master -- '*.ts' '*.tsx'` and grep for any non-comment, non-whitespace change inside `<PACKAGE_PATH>/src/`. Any logic change is a blocker.

## Mechanic

For each modified file in the PR:
1. `gh pr diff <PR_URL> -- <file>` to read the diff.
2. Re-read the file in full from the PR's head ref to see context.
3. Run the blocker checks above.
4. Collect findings as `<file>:<line>: <category> — <one-line explanation>`.

## Output format

If clean: a single line `LGTM`.

If blockers exist, output one Markdown section:

```markdown
## Blockers (<N>)

1. `packages/foo/src/bar.ts:42` — **Restatement.** Purpose line "Adds a variant to the cart" duplicates the function name `addToCart`. Describe intent: when is this called, what side effects happen.
2. `packages/foo/src/baz.ts:88` — **Missing `@throws`.** `throw new CartFullError(...)` at line 91 has no corresponding `@throws {CartFullError}` tag.
…

## Soft findings (<N>)

(non-blocking, generator may address opportunistically)
…
```

If reviewer flags >20 blockers, set the first line of the output to `ABORT: too noisy, recommend orchestrator narrow generator scope to a subdirectory and retry`. Then list the blockers anyway.
```

- [ ] **Step 2: Verify the file was written**

Run: `wc -l .specs/2026-05-27-jsdoc-coverage-retrofit/reviewer-prompt.md`
Expected: ~55 lines.

### Task 3: Initialize the wave log

**Files:**
- Create: `.specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md`

- [ ] **Step 1: Create the log scaffold**

```markdown
# JSDoc Retrofit — Wave Log

Append one section per wave as it completes. Use this as the orchestrator's running state.

---

## Wave 1 — Foundations (errors + utils)

Status: pending
Started: —
Completed: —
PRs:
- `packages/errors`: —
- `packages/utils`: —
Calibration findings: —

## Wave 2 — Independent foundations (db, tagtree, shopify-graphql, cart/core)

Status: pending
Started: —
Completed: —
PRs: —

## Wave 3 — Dependent packages (shopify-html, marketing-common, test-mongo, cart/shopify, cart/react)

Status: pending

## Wave 4 — Large packages (cart/next, cms)

Status: pending

## Wave 5 — Apps (admin, storefront)

Status: pending

## Wave 6 — Final (landing)

Status: pending
```

### Task 4: Commit the orchestration artifacts

- [ ] **Step 1: Stage and commit**

```bash
git add .specs/2026-05-27-jsdoc-coverage-retrofit/generator-prompt.md \
        .specs/2026-05-27-jsdoc-coverage-retrofit/reviewer-prompt.md \
        .specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md
git commit -m "$(cat <<'EOF'
docs(specs): add jsdoc retrofit orchestration prompts.

Generator and reviewer prompt templates plus wave log scaffold for
the campaign described in spec.md. Templates parameterize the per-
package recipe so each subagent dispatch reuses the same wording.
EOF
)"
```

- [ ] **Step 2: Verify commit**

Run: `git log -1 --stat`
Expected: 1 commit, 3 files added.

---

## Phase 1 — Wave 1 (errors + utils, parallel)

Smallest, zero-dependency packages. Validates the workflow end-to-end before scaling.

### Task 5: Pre-wave checks

- [ ] **Step 1: Verify clean working tree**

Run: `git status --porcelain && git rev-parse --abbrev-ref HEAD`
Expected: empty output, `master`.

- [ ] **Step 2: Sync with origin**

Run: `git fetch origin && git rev-list --count HEAD..origin/master`
Expected: `0` (or pull if non-zero).

- [ ] **Step 3: Update wave-log Wave 1 status to `in_progress` with start timestamp**

Edit `.specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md` Wave 1 section.

- [ ] **Step 4: Commit the wave-log update**

```bash
git add .specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md
git commit -m "docs(specs): mark jsdoc retrofit wave 1 in progress."
```

### Task 6: Create worktrees for errors and utils

- [ ] **Step 1: Create worktree for `packages/errors`**

Run:
```bash
git worktree add -b docs/jsdoc-errors worktrees/jsdoc-errors master
```
Expected: `Preparing worktrees/jsdoc-errors (new branch 'docs/jsdoc-errors')`

- [ ] **Step 2: Create worktree for `packages/utils`**

Run:
```bash
git worktree add -b docs/jsdoc-utils worktrees/jsdoc-utils master
```

- [ ] **Step 3: Verify both worktrees exist**

Run: `git worktree list`
Expected: three rows — main, jsdoc-errors, jsdoc-utils.

### Task 7: Dispatch generator subagents for errors and utils in parallel

- [ ] **Step 1: Spawn both generators in a single message**

Send a single message containing two `Agent` tool invocations. Each gets `subagent_type: "general-purpose"` and the generator-prompt template populated for its package.

Errors invocation:
```json
{
  "description": "JSDoc generator for packages/errors",
  "subagent_type": "general-purpose",
  "prompt": "<contents of .specs/2026-05-27-jsdoc-coverage-retrofit/generator-prompt.md, with <PACKAGE_PATH>=packages/errors, <PACKAGE_NPM_NAME>=@nordcom/commerce-errors, <WORKTREE_PATH>=worktrees/jsdoc-errors, <PACKAGE_SLUG>=errors, <COMMIT_SCOPE>=errors>"
}
```

Utils invocation:
```json
{
  "description": "JSDoc generator for packages/utils",
  "subagent_type": "general-purpose",
  "prompt": "<contents of generator-prompt.md, with <PACKAGE_PATH>=packages/utils, <PACKAGE_NPM_NAME>=@nordcom/commerce-utils, <WORKTREE_PATH>=worktrees/jsdoc-utils, <PACKAGE_SLUG>=utils, <COMMIT_SCOPE>=utils>"
}
```

Resolve `<PACKAGE_NPM_NAME>` by reading the `name` field of each package's `package.json` first.

- [ ] **Step 2: Capture PR URLs from each agent's return value**

Each agent returns its PR URL. Record both in the orchestrator's working memory.

- [ ] **Step 3: If a generator aborted on preconditions, fix or surface**

If either agent reported a precondition failure (typecheck/lint dirty on baseline), the campaign cannot proceed for that package without first fixing the baseline. Surface to the human; do not attempt to fix as part of this campaign.

### Task 8: Dispatch reviewer subagent for `packages/errors` PR

- [ ] **Step 1: Spawn reviewer**

```json
{
  "description": "JSDoc reviewer for errors PR",
  "subagent_type": "general-purpose",
  "prompt": "<contents of .specs/2026-05-27-jsdoc-coverage-retrofit/reviewer-prompt.md, with <PR_URL>=<url from Task 7>, <PACKAGE_PATH>=packages/errors, <PACKAGE_SLUG>=errors>"
}
```

- [ ] **Step 2: If reviewer returns `LGTM`, mark ready for human merge**

Append to wave log Wave 1 → `packages/errors`: `<PR_URL>` — LGTM, ready to merge.

- [ ] **Step 3: If reviewer returns blockers, re-dispatch generator with review**

Spawn a new `general-purpose` subagent with prompt:
```
You previously generated JSDoc for packages/errors on branch docs/jsdoc-errors. The code-reviewer agent found these blockers — fix each one with another commit on the same branch. Do not change any non-JSDoc code. After fixing, push and reply with the new HEAD SHA.

<paste reviewer's full output>
```

- [ ] **Step 4: Re-dispatch reviewer on the updated PR**

Repeat Steps 1–3. Loop until reviewer returns `LGTM`. Hard ceiling: 3 review cycles. If still not clean, escalate to human.

- [ ] **Step 5: Ask human to merge**

Once `LGTM`, surface: "Errors PR is clean and ready to merge: `<PR_URL>`. Please merge when ready." Do not merge as the orchestrator.

### Task 9: Dispatch reviewer subagent for `packages/utils` PR

Repeat the Task 8 pattern with parameters:
- `<PR_URL>` from utils generator
- `<PACKAGE_PATH>` = `packages/utils`
- `<PACKAGE_SLUG>` = `utils`

(Same five steps as Task 8.)

### Task 10: Calibration gate

Once both PRs are merged on `master`.

- [ ] **Step 1: Pull the latest master**

```bash
git checkout master && git pull --ff-only origin master
```

- [ ] **Step 2: Read both merged commits side-by-side**

```bash
git log --oneline master --grep="docs(errors)" --grep="docs(utils)" -2
```
Then for each commit: `git show <sha> -- '*.ts' '*.tsx'`.

- [ ] **Step 3: Audit against templates**

Look for patterns the reviewer caught repeatedly (e.g., consistent confusion about Tier-1 vs Tier-2 for re-exported types). If a pattern emerges, the spec template has a gap.

- [ ] **Step 4: Update spec if needed**

If gaps found, edit `.specs/2026-05-27-jsdoc-coverage-retrofit/spec.md` to clarify the missed pattern. Commit:
```bash
git add .specs/2026-05-27-jsdoc-coverage-retrofit/spec.md
git commit -m "docs(specs): clarify jsdoc tier rule for <pattern> after wave 1 feedback."
```

- [ ] **Step 5: Append calibration findings to wave log**

Update `.specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md` Wave 1 → Calibration findings: list each template gap found and the line edited. If none: write `No template gaps; proceeding to wave 2.`

- [ ] **Step 6: Clean up wave 1 worktrees**

```bash
git worktree remove worktrees/jsdoc-errors
git worktree remove worktrees/jsdoc-utils
git branch -D docs/jsdoc-errors docs/jsdoc-utils
```

- [ ] **Step 7: Commit wave-log update**

```bash
git add .specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md
git commit -m "docs(specs): mark jsdoc retrofit wave 1 complete with calibration findings."
```

---

## Phase 2 — Wave 2 (db, tagtree, shopify-graphql, cart/core — 4 in parallel)

### Task 11: Pre-wave checks and worktrees

- [ ] **Step 1: Verify clean tree on master synced with origin**

Run: `git status --porcelain && git fetch && git rev-list --count HEAD..origin/master`
Expected: empty, `0`.

- [ ] **Step 2: Mark Wave 2 in_progress in wave log**

Edit `.specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md` and commit.

- [ ] **Step 3: Create four worktrees**

```bash
git worktree add -b docs/jsdoc-db worktrees/jsdoc-db master
git worktree add -b docs/jsdoc-tagtree worktrees/jsdoc-tagtree master
git worktree add -b docs/jsdoc-shopify-graphql worktrees/jsdoc-shopify-graphql master
git worktree add -b docs/jsdoc-cart-core worktrees/jsdoc-cart-core master
```

### Task 12: Dispatch four generators in parallel

- [ ] **Step 1: Resolve npm names**

For each package, read `<package>/package.json#name`:
- `packages/db` → likely `@nordcom/commerce-db` (verify)
- `packages/tagtree` → likely `@nordcom/tagtree` (verify)
- `packages/shopify-graphql` → likely `@nordcom/commerce-shopify-graphql` (verify)
- `packages/cart/core` → likely `@nordcom/cart-core` (verify)

- [ ] **Step 2: Spawn four `general-purpose` generators in a single message**

One `Agent` invocation per package, all in the same message so they run concurrently. Each prompt is the generator-prompt template parameterized per package.

Parameters per package:

| Package                      | `<PACKAGE_SLUG>`  | `<COMMIT_SCOPE>`   |
|------------------------------|-------------------|--------------------|
| `packages/db`                | `db`              | `db`               |
| `packages/tagtree`           | `tagtree`         | `tagtree`          |
| `packages/shopify-graphql`   | `shopify-graphql` | `shopify-graphql`  |
| `packages/cart/core`         | `cart-core`       | `cart-core`        |

- [ ] **Step 3: Capture four PR URLs**

Record each in working memory.

### Task 13: Dispatch reviewers for all four PRs

- [ ] **Step 1: Spawn four `general-purpose` reviewer agents in a single message (each populated with reviewer-prompt.md)**

Same pattern as Task 8 Step 1, four invocations in one message.

- [ ] **Step 2: For each `LGTM`, surface to human for merge**

- [ ] **Step 3: For each blockers response, re-dispatch generator with review and re-review**

Loop ceiling: 3 cycles per package.

### Task 14: Wave 2 cleanup

- [ ] **Step 1: After all 4 PRs merged on master, pull latest**

```bash
git checkout master && git pull --ff-only origin master
```

- [ ] **Step 2: Remove worktrees and branches**

```bash
for slug in db tagtree shopify-graphql cart-core; do
  git worktree remove "worktrees/jsdoc-$slug"
  git branch -D "docs/jsdoc-$slug"
done
```

- [ ] **Step 3: Append Wave 2 completion to wave log; commit**

---

## Phase 3 — Wave 3 (shopify-html, marketing-common, test-mongo, cart/shopify, cart/react — 5 in parallel)

### Task 15: Pre-wave checks and worktrees

Same as Task 11, but creating five worktrees:

```bash
git worktree add -b docs/jsdoc-shopify-html worktrees/jsdoc-shopify-html master
git worktree add -b docs/jsdoc-marketing-common worktrees/jsdoc-marketing-common master
git worktree add -b docs/jsdoc-test-mongo worktrees/jsdoc-test-mongo master
git worktree add -b docs/jsdoc-cart-shopify worktrees/jsdoc-cart-shopify master
git worktree add -b docs/jsdoc-cart-react worktrees/jsdoc-cart-react master
```

### Task 16: Dispatch five generators in parallel

Same pattern as Task 12 with five `Agent` invocations:

| Package                      | `<PACKAGE_SLUG>`    | `<COMMIT_SCOPE>`     |
|------------------------------|---------------------|----------------------|
| `packages/shopify-html`      | `shopify-html`      | `shopify-html`       |
| `packages/marketing-common`  | `marketing-common`  | `marketing-common`   |
| `packages/test-mongo`        | `test-mongo`        | `test-mongo`         |
| `packages/cart/shopify`      | `cart-shopify`      | `cart-shopify`       |
| `packages/cart/react`        | `cart-react`        | `cart-react`         |

### Task 17: Dispatch five reviewers in parallel

- [ ] **Step 1: Spawn five `general-purpose` reviewer agents in a single message (each populated with reviewer-prompt.md)**

For each PR captured in Task 16:

| Sub-PR (from Task 16)        | `<PACKAGE_PATH>`             | `<PACKAGE_SLUG>`    |
|------------------------------|------------------------------|---------------------|
| shopify-html PR              | `packages/shopify-html`      | `shopify-html`      |
| marketing-common PR          | `packages/marketing-common`  | `marketing-common`  |
| test-mongo PR                | `packages/test-mongo`        | `test-mongo`        |
| cart-shopify PR              | `packages/cart/shopify`      | `cart-shopify`      |
| cart-react PR                | `packages/cart/react`        | `cart-react`        |

Each invocation uses `reviewer-prompt.md` populated with the row's values plus the corresponding `<PR_URL>`.

- [ ] **Step 2: For each `LGTM`, surface to human for merge**

- [ ] **Step 3: For each blockers response, re-dispatch generator + re-review (cap 3 cycles per package)**

### Task 18: Wave 3 cleanup

- [ ] **Step 1: After all 5 PRs merged on master, pull latest**

```bash
git checkout master && git pull --ff-only origin master
```

- [ ] **Step 2: Remove worktrees and branches**

```bash
for slug in shopify-html marketing-common test-mongo cart-shopify cart-react; do
  git worktree remove "worktrees/jsdoc-$slug"
  git branch -D "docs/jsdoc-$slug"
done
```

- [ ] **Step 3: Append Wave 3 completion to wave log; commit**

---

## Phase 4 — Wave 4 (cart/next + cms)

cms is the largest package layer (126 files). Run alongside cart/next but be ready for the cms generator to need extra cycles.

### Task 19: Pre-wave checks and worktrees

```bash
git worktree add -b docs/jsdoc-cart-next worktrees/jsdoc-cart-next master
git worktree add -b docs/jsdoc-cms worktrees/jsdoc-cms master
```

### Task 20: Dispatch two generators in parallel

| Package                      | `<PACKAGE_SLUG>`    | `<COMMIT_SCOPE>`     |
|------------------------------|---------------------|----------------------|
| `packages/cart/next`         | `cart-next`         | `cart-next`          |
| `packages/cms`               | `cms`               | `cms`                |

### Task 21: Dispatch two reviewers

- [ ] **Step 1: Spawn two `general-purpose` reviewer agents in a single message (each populated with reviewer-prompt.md)**

| Sub-PR             | `<PACKAGE_PATH>`     | `<PACKAGE_SLUG>` |
|--------------------|----------------------|------------------|
| cart-next PR       | `packages/cart/next` | `cart-next`      |
| cms PR             | `packages/cms`       | `cms`            |

- [ ] **Step 2: For `LGTM`, surface to human for merge**

- [ ] **Step 3: For blockers, re-dispatch generator + re-review**

Cap cycles at **4** for cms (instead of 3) given its size. cart/next stays at 3.

### Task 22: Wave 4 cleanup

- [ ] **Step 1: After both PRs merged, pull latest master**

```bash
git checkout master && git pull --ff-only origin master
```

- [ ] **Step 2: Remove worktrees and branches**

```bash
for slug in cart-next cms; do
  git worktree remove "worktrees/jsdoc-$slug"
  git branch -D "docs/jsdoc-$slug"
done
```

- [ ] **Step 3: Append Wave 4 completion to wave log; commit**

---

## Phase 5 — Wave 5 (apps/admin + apps/storefront)

`apps/admin` runs as a single PR (82 in-scope files). `apps/storefront` splits per the spec into multiple sub-PRs by top-level `src/` directory.

### Task 23: Dispatch generator for `apps/admin`

- [ ] **Step 1: Create worktree**

```bash
git worktree add -b docs/jsdoc-admin worktrees/jsdoc-admin master
```

- [ ] **Step 2: Resolve npm name from `apps/admin/package.json`**

- [ ] **Step 3: Spawn one `general-purpose` generator**

Parameters: `<PACKAGE_PATH>=apps/admin`, `<PACKAGE_SLUG>=admin`, `<COMMIT_SCOPE>=admin`.

Note: apps are typically in `.changeset/config.json#ignore`. The generator will skip the changeset step automatically per its precondition.

- [ ] **Step 4: Capture PR URL**

### Task 24: Review and loop for `apps/admin`

- [ ] **Step 1: Spawn `general-purpose` reviewer agent (populated with reviewer-prompt.md)**

Parameters: `<PR_URL>` from Task 23 Step 4, `<PACKAGE_PATH>` = `apps/admin`, `<PACKAGE_SLUG>` = `admin`.

- [ ] **Step 2: For `LGTM`, surface to human for merge**

- [ ] **Step 3: For blockers, re-dispatch generator + re-review**

Cap cycles at **4** given app complexity.

- [ ] **Step 4: Append admin PR URL and outcome to wave log Wave 5 section**

### Task 25: Dispatch storefront generators (4 sub-PRs, one per top-level src directory)

Per spec § "Split rule for apps/storefront", split into four sub-PRs.

- [ ] **Step 1: Enumerate `apps/storefront/src/` subdirectories**

Run:
```bash
ls -d apps/storefront/src/*/
```
Confirm the four expected: `app`, `components`, `hooks`, `lib`. (If more exist, add a sub-PR per extra directory.)

- [ ] **Step 2: Create four worktrees, one per sub-PR**

```bash
git worktree add -b docs/jsdoc-storefront-components worktrees/jsdoc-storefront-components master
git worktree add -b docs/jsdoc-storefront-lib        worktrees/jsdoc-storefront-lib        master
git worktree add -b docs/jsdoc-storefront-hooks      worktrees/jsdoc-storefront-hooks      master
git worktree add -b docs/jsdoc-storefront-app        worktrees/jsdoc-storefront-app        master
```

- [ ] **Step 3: Spawn four generators sequentially (NOT in parallel)**

storefront sub-PRs touch the same package and would race on `pnpm changeset` and on per-file conflicts if anything cross-imports inside src. Run them one at a time. Each generator's prompt MUST include an extra constraint:

```
Restrict in-scope files to `apps/storefront/src/<SUBDIR>/**`. Do NOT touch any file outside that subdirectory.
```

Per sub-PR:

| Sub-PR slug                       | Subdir            | Commit scope          |
|-----------------------------------|-------------------|-----------------------|
| `jsdoc-storefront-components`     | `components/`     | `storefront-components` |
| `jsdoc-storefront-lib`            | `lib/`            | `storefront-lib`        |
| `jsdoc-storefront-hooks`          | `hooks/`          | `storefront-hooks`      |
| `jsdoc-storefront-app`            | `app/` (non-framework files only) | `storefront-app`     |

- [ ] **Step 4: Capture four PR URLs in sequence**

### Task 26: Review and loop for each storefront sub-PR

- [ ] **Step 1: Spawn one `general-purpose` reviewer (populated with reviewer-prompt.md) per sub-PR (sequential, not parallel)**

Sequential so that if blockers reveal a systemic issue, the next sub-PR's generator can be re-dispatched with that knowledge baked into its prompt.

For each of the four sub-PRs from Task 25:

| Sub-PR slug                       | `<PACKAGE_PATH>`        | `<PACKAGE_SLUG>`         |
|-----------------------------------|-------------------------|--------------------------|
| `jsdoc-storefront-components`     | `apps/storefront`       | `storefront-components`  |
| `jsdoc-storefront-lib`            | `apps/storefront`       | `storefront-lib`         |
| `jsdoc-storefront-hooks`          | `apps/storefront`       | `storefront-hooks`       |
| `jsdoc-storefront-app`            | `apps/storefront`       | `storefront-app`         |

Cap each at 4 review cycles.

- [ ] **Step 2: Surface each `LGTM` for human merge before moving to the next sub-PR**

### Task 27: Wave 5 cleanup

- [ ] **Step 1: After all 5 PRs (admin + 4 storefront subs) merged, pull latest master**

```bash
git checkout master && git pull --ff-only origin master
```

- [ ] **Step 2: Remove worktrees and branches**

```bash
for slug in admin storefront-components storefront-lib storefront-hooks storefront-app; do
  git worktree remove "worktrees/jsdoc-$slug"
  git branch -D "docs/jsdoc-$slug"
done
```

- [ ] **Step 3: Append Wave 5 completion to wave log; commit**

---

## Phase 6 — Wave 6 (apps/landing)

18 in-scope files, single PR.

### Task 28: Dispatch and review for `apps/landing`

- [ ] **Step 1: Worktree**

```bash
git worktree add -b docs/jsdoc-landing worktrees/jsdoc-landing master
```

- [ ] **Step 2: Spawn generator**

Parameters: `<PACKAGE_PATH>=apps/landing`, `<PACKAGE_SLUG>=landing`, `<COMMIT_SCOPE>=landing`.

- [ ] **Step 3: Dispatch reviewer**

```
Spawn one general-purpose reviewer agent (with reviewer-prompt.md content as the prompt):
  <PR_URL>        = <captured in Step 2>
  <PACKAGE_PATH>  = apps/landing
  <PACKAGE_SLUG>  = landing
```

Loop: re-dispatch generator on blockers, re-review. Cap 3 cycles. On `LGTM`, surface to human for merge.

- [ ] **Step 4: After merge, pull master and clean up worktree**

```bash
git checkout master && git pull --ff-only origin master
git worktree remove worktrees/jsdoc-landing
git branch -D docs/jsdoc-landing
```

- [ ] **Step 5: Remove the now-empty worktrees/ directory if no other worktrees remain**

```bash
[ -z "$(ls -A worktrees 2>/dev/null)" ] && rmdir worktrees || echo "worktrees/ not empty, leaving in place"
```

- [ ] **Step 6: Append Wave 6 completion to wave log; commit**

---

## Phase 7 — Completion verification

### Task 29: Re-run repo-wide coverage scan

- [ ] **Step 1: Pull latest master**

```bash
git checkout master && git pull --ff-only origin master
```

- [ ] **Step 2: Run the per-package coverage script**

```bash
for d in packages/* apps/*; do
  [ -d "$d" ] || continue
  [ "$d" = "packages/vite.config.ts" ] && continue
  total=$(find "$d" -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.next/*" \
    ! -path "*/coverage/*" ! -name "*.d.ts" ! -name "*.test.*" \
    ! -name "*.spec.*" ! -name "*.stories.*" 2>/dev/null | wc -l | tr -d ' ')
  with=$(find "$d" -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.next/*" \
    ! -path "*/coverage/*" ! -name "*.d.ts" ! -name "*.test.*" \
    ! -name "*.spec.*" ! -name "*.stories.*" \
    -exec grep -l "^\s*/\*\*" {} \; 2>/dev/null | wc -l | tr -d ' ')
  [ "$total" -eq 0 ] && continue
  pct=$((with * 100 / total))
  printf "%-50s %4d files, %4d w/jsdoc (%d%%)\n" "$d" "$total" "$with" "$pct"
done
```

Expected: every in-scope package/app at ≥95% file-level JSDoc presence. (Some files genuinely have no in-scope symbols — pure type re-exports for instance — so 100% file-level isn't a hard target, but every in-scope package should be in the high-90s.)

- [ ] **Step 3: Spot-check three random files**

Pick three random files from three different in-scope packages. Read each. Confirm every in-scope symbol has a JSDoc block matching its tier.

- [ ] **Step 4: Confirm no new lint rule introduced**

Run: `git diff master~30 master -- biome.json package.json .github/`
Expected: no JSDoc-related additions (per non-goals).

### Task 30: Mark spec status as Done

- [ ] **Step 1: Edit spec status header**

In `.specs/2026-05-27-jsdoc-coverage-retrofit/spec.md`, change `**Status:** Draft` to `**Status:** Done — <YYYY-MM-DD>`.

- [ ] **Step 2: Append completion summary to wave log**

In `.specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md`, add a `## Completion` section listing final per-package coverage % and total PRs merged.

- [ ] **Step 3: Commit**

```bash
git add .specs/2026-05-27-jsdoc-coverage-retrofit/spec.md \
        .specs/2026-05-27-jsdoc-coverage-retrofit/wave-log.md
git commit -m "$(cat <<'EOF'
docs(specs): close jsdoc coverage retrofit spec.

All 16 in-scope packages/apps documented at the per-tier quality
bar. CLAUDE.md remains the single enforcement source; no CI gate
added per spec non-goals.
EOF
)"
```

---

## Cross-cutting failure handling

These apply at any phase.

**A. Master moves under us during a wave.** If `git fetch` shows commits on `origin/master` between waves, the orchestrator must rebase each open worktree branch onto the new master before proceeding:
```bash
for slug in <active-slugs>; do
  ( cd "worktrees/jsdoc-$slug" && git fetch origin && git rebase origin/master )
done
```
Resolve conflicts (almost always JSDoc-vs-JSDoc, easy) or abort the affected branch and re-dispatch the generator.

**B. Generator exceeds context mid-file.** The generator's prompt instructs it to commit work-so-far and report the stopping file. Orchestrator resumes by:
1. Re-dispatching the generator with an extra instruction: `Resume from <file>. The branch already has commits; do not re-edit files committed earlier.`

**C. Reviewer flags >20 issues.** Generator scope was too broad. Abort current dispatch:
```bash
git checkout master
git worktree remove worktrees/jsdoc-<slug>
git branch -D docs/jsdoc-<slug>
```
Re-dispatch with explicit subdirectory restriction (use the storefront split pattern).

**D. Human declines to merge a PR.** Surface their feedback, treat it as additional reviewer blockers, re-dispatch generator. Do not proceed to the next wave until the wave's PRs are all merged or explicitly skipped.

**E. A package is in `.changeset/config.json#ignore` but generator created a changeset anyway.** Reviewer must catch this and flag as a blocker. Generator deletes the spurious `.changeset/*.md` file in its fix pass.

---

## DRY notes

- The per-package recipe is defined exactly once in `generator-prompt.md` (Task 1). Every wave task references it by path.
- The per-PR review brief is defined exactly once in `reviewer-prompt.md` (Task 2). Every reviewer dispatch references it.
- Wave-cleanup pattern is identical across Tasks 10, 14, 18, 22, 27. The shell snippets are spelled out per wave anyway because the slug lists differ.

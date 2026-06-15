# Admin Account Settings — Spec

**Date:** 2026-06-15
**Surface:** Admin app (`apps/admin`), operator-facing.

## Goal

Build out the placeholder operator account page (`apps/admin/src/app/(app)/(user)/accounts/page.tsx`) into a real, tested account settings page, and make the supporting infrastructure (avatar source, theme preference) real and persisted.

## Resolved decisions (from grilling)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Surface | Admin "my account" (not storefront, not `[domain]/settings`). |
| 2 | Target page | Build out the existing placeholder at `(app)/(user)/accounts/page.tsx` (domain-agnostic, already linked from the shell account menu). |
| 3 | Sections | Profile (edit name, read-only avatar) · Account info (read-only) · Connected accounts (read-only identities) · Preferences (theme). |
| 4 | Avatar | **Gravatar, admin-only** — derived from a hash of the operator's email. Replaces the GitHub `avatar_url` source. Read-only on the page with a helper note + link to gravatar.com. **Must NOT affect storefront users.** |
| 5 | Name | Editable. Convex `users.name` is the single source of truth; wired into the shell header (currently passes `name: undefined`). |
| 6 | Theme | `Dark` / `System` toggle, default `System`. No light theme yet, so it is visually inert today but fully wired ("light-ready"): a future `[data-theme="light"]` token block is the only thing needed to make it visible. |
| 7 | Theme storage | Convex `users.preferences.theme` is the durable, cross-device source of truth; a cookie mirror drives no-flash SSR. |
| 8 | Theme plumbing | Full provider: cookie + `matchMedia` resolution + no-flash inline script + un-pin the hardcoded `data-theme="dark"`. |
| 9 | Self-update authz | New `account/self:update` mutation on `authedMutation` — the caller can only patch its **own** email-keyed `users` row; new values arrive as args, identity comes from the trusted token, never the client. |
| 10 | Save model | Name = explicit Save → server action → Convex → `sonner` toast (button dirty-gated). Theme = instant autosave on change. |
| 11 | Testing | convex-test for the mutation/query auth boundary + behavior; vitest component/unit for every new UI/util; Playwright e2e for the page against the existing authenticated admin harness. |
| 12 | Changeset | **None.** `@nordcom/commerce-convex` and `@nordcom/commerce-admin` are both in the changeset `ignore` list (`['@nordcom/*', '!@nordcom/cart-*']`). |

## Non-goals (explicit follow-ups)

- A real **light theme** token set (the toggle is wired but inert until this lands).
- Admin **i18n / locale** preference (no admin translation layer exists).
- **Notification** preferences (no notification system exists).
- Avatar **upload** (Gravatar is read-only; users change it on gravatar.com).
- Disconnect/link **OAuth identities** (connected accounts are read-only).
- Storefront customer account settings (separate surface, separate plan).

## Key constraints (from CLAUDE.md / codebase)

- Throw via `@nordcom/commerce-errors` in app code; inside Convex isolates use `ConvexError` with a stable `code` (the sanctioned in-runtime contract).
- `noUncheckedIndexedAccess` — index access is `T | undefined`; no `!`.
- JSDoc on every function/component; comments document WHY only.
- Biome only; American English; trailing slashes on internal links.
- Touching `packages/convex/**` triggers the limit-boundary CI gate (`pnpm --filter @nordcom/commerce-test-convex run test src/limits`).
- After a schema change, run `pnpm --filter @nordcom/commerce-convex codegen`.
- Server Components by default; `'use client'` only where needed; never import a `server-only` module from a Client Component.

# `next-build-notifier` — Spec

**Issue:** [#2029 — New build indicator](https://github.com/filiphsps/commerce/issues/2029)

**One-liner:** A standalone, public, Next.js-specific npm package that detects when a newer build/deployment of the running app exists and exposes a **headless** API (provider + hook + render-prop) so each app styles its own "a new version is available" UI. Wired into storefront (per-shop CMS-configurable), admin, and landing.

## Problem

Storefront, admin, and landing all want to tell users when a newer build is live so they can reload (stale chunks, version skew, fixes). Today there is no such indicator and no shared mechanism. Duplicating per-app logic is the wrong move; Vercel offers skew-related primitives but Next's native `deploymentId` only forces a *hard navigation on skew* — it is not a user-facing, dismissable "update available" prompt.

## Solution shape

A new package `next-build-notifier` (at `packages/next-build-notifier`), published to npm under that bare name (MIT, public). It is Next-specific and splits into three subpath exports:

| Export | Contents | Runtime |
|---|---|---|
| `next-build-notifier` (`.`) | `BuildNotifierProvider`, `useBuildNotification()`, `<BuildNotifier>` render-prop, types | client (`'use client'`) |
| `next-build-notifier/server` | `createVersionRoute()` route-handler factory, `resolveBuildId()` | server (route handler) |
| `next-build-notifier/config` | `withBuildNotifier()` next.config wrapper | build (next.config) |

### Detection model

1. **Each end derives its build id from the same source** via `resolveBuildId(env)`:
   `VERCEL_DEPLOYMENT_ID ?? GIT_COMMIT_SHA ?? VERCEL_GIT_COMMIT_SHA ?? NEXT_PUBLIC_BUILD_ID ?? BUILD_ID`.
2. `withBuildNotifier()` bakes `NEXT_PUBLIC_BUILD_ID` (the client's *own* id, frozen at build) into the app and optionally sets Next's native `deploymentId` to the same value (skew handling) — composing with the app's existing `generateBuildId`/`env`.
3. The app mounts a version endpoint (default `/api/version`) via `createVersionRoute()`; at **runtime** it returns the *current* deployment's id.
4. The client polls the endpoint and compares the returned id to its baked `currentBuildId`. **Mismatch ⇒ update available.**

> Vercel note: with Skew Protection on, framework-managed requests are pinned to the serving deployment, but a plain client `fetch()` is **not** pinned — so the version fetch hits the current production deployment and correctly observes the new id. The endpoint must be `no-store`.

### Headless client API (locked decisions)

- `<BuildNotifierProvider>` owns polling + state. `useBuildNotification()` returns state+actions (throws outside a provider). `<BuildNotifier>{(state) => ...}` is a render-prop over the same context. Zero styles shipped.
- **Polling:** `intervalMs` — a *falsy* value (`0`/`undefined`) disables the periodic timer (latest user instruction; apps pass `60_000` explicitly). Plus `refetchOnFocus`/`refetchOnVisible`/`refetchOnReconnect` (default true) and `pauseWhenHidden` (default true).
- **Update UX:** dismissable; dismissal persisted **per build id** in `sessionStorage` (reappears for the *next* new build). `reload()` = hard `window.location.reload()`. `autoReload` opt-in (default off). `onUpdateAvailable(latestId)` callback (fires once per new id).
- **Disabled** when `enabled === false` or `currentBuildId` is falsy/`'development'`/`'dev'` — no polling in dev.

### Per-app integration

- **Storefront (multi-tenant):** full per-shop CMS editor field. New `buildNotifier` entry on the `shop.extensions` manifest — `{ enabled, position: 'top'|'bottom', copy, autoReload, dismissable }` — edited in admin's **Customization → Components** tab (auto-rendered from `COMPONENT_SETTINGS`), resolved by `resolveExtensions`, rendered by a storefront banner themed from shop CSS vars (`var(--accent)` etc.) with localized default copy.
- **Admin:** fixed Nordcom-styled banner built from `@nordcom/nordstar` (`Card`/`Button`/`View`), mounted in the app shell. Plain English.
- **Landing:** fixed Nordcom-styled banner, mounted in both group layouts. Plain English.

### Out of scope (explicit, no silent caps)

- **Landing e2e:** landing has no Playwright harness and CLAUDE.md mandates e2e only for admin/storefront. We do **not** stand up a landing e2e harness in this work. Stated, not hidden.
- Per-shop arbitrary colors: storefront banner colors derive from shop theme tokens only (cohesion), not free-form color pickers.

## Frontend-design direction (the three styled banners)

This is a micro-surface, not a hero page: **spend boldness in one place, keep the rest quiet.** Complexity matched to a notification → precision in spacing/type/motion/copy.

- **Signature (the one memorable element):** a *one-shot* freshness reveal — a small status ring that draws once (~600ms) when the update is detected, then goes static. **No perpetual pulsing** (that reads AI-generated and nags). In admin, the signature instead *encodes information*: a short SHA delta `a1b2c3d → ef45678` (structure-is-information; operators read it, it is not decoration).
- **Motion:** one orchestrated entrance — `translateY(8px)→0` + `opacity 0→1`, ~240ms ease-out; dismissal reverses. `prefers-reduced-motion` ⇒ opacity-only, no transform, no ring draw.
- **Placement:** floating, bottom by default (storefront `position` config flips to top = slide-down); admin bottom-right toast (desktop-app convention); landing bottom bar. Safe-area-inset aware, full-width on mobile.
- **Copy (active voice, one verb throughout):** action label is **"Reload"** everywhere (button says Reload → page reloads — consistent). Headline tuned per audience: storefront "A new version is available" (localized), admin "New build deployed", landing "We shipped an update". Dismiss = `aria-label="Dismiss"`, visual ✕. No apology, no filler.
- **Quality floor:** `role="status"` + `aria-live="polite"`; visible keyboard focus on Reload/Dismiss; responsive to mobile; reduced-motion respected.

## npm reservation + trusted publishing

Reserve the name **first** (before building): a one-time manual `npm publish` of a `0.0.0` stub (run by the maintainer — outward/irreversible, not automatable here), then configure the GitHub Actions **trusted publisher** for the package on npmjs.com (`filiphsps/commerce`, `release.yml`). Subsequent real releases flow through the existing changesets + OIDC workflow (`id-token: write`, `NPM_CONFIG_PROVENANCE: true`). Standalone name ⇒ not in changeset `ignore` ⇒ a changeset is required.

## Docs

Public docs at https://nordcom.store/docs/. Add a handwritten `overview.mdx` + `changelog.mdx` under `apps/docs/content/packages/<category>/next-build-notifier/`, register the package in `_categories.json` + `meta.json`, and point the package `homepage` to its docs subdir. API reference is auto-generated by `pnpm docs:gen` (typedoc); gate is `pnpm docs:gen:check`.

## Branch / workspace

Branch `feat/2029-build-notifier` off `master` in a sibling git worktree `../commerce-build-notifier`.

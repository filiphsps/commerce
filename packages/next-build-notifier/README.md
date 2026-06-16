# next-build-notifier

A headless "new build available" indicator for Next.js. Detects when a newer deployment is live and surfaces that state to your UI — no opinions about how to render it.

Works on any host. Ships first-class support for Vercel deployments.

## Install

```bash
pnpm add next-build-notifier
```

Peer dependencies: `react >= 18`, `react-dom >= 18`, `next >= 14` (optional).

## Usage

### 1. Wrap your Next.js config

```ts
// next.config.ts
import { withBuildNotifier } from 'next-build-notifier/config';
import type { NextConfig } from 'next';

const config: NextConfig = { /* … */ };
export default withBuildNotifier(config);
```

`withBuildNotifier` injects `NEXT_PUBLIC_BUILD_ID` into the client bundle at build time so the browser always knows which build it started on.

### 2. Add the version route handler

```ts
// app/api/version/route.ts
import { createVersionRoute } from 'next-build-notifier/server';

export const dynamic = 'force-dynamic';
export const { GET } = createVersionRoute();
```

This endpoint returns the current deployment's build ID. Marking it `force-dynamic` ensures it is never cached at the framework layer and always reflects the live deployment.

### 3. Mount the provider and render (or go headless)

`BuildNotifierProvider` is a Client Component, so wrap it in your own client boundary and mount that from the (server) root layout.

```tsx
// app/providers.tsx
'use client';

import { BuildNotifierProvider, BuildNotifier } from 'next-build-notifier';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <BuildNotifierProvider currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID!} intervalMs={60_000}>
            {children}
            {/* Render-prop: receives the live state and lets you own the UI */}
            <BuildNotifier>
                {(s) =>
                    s.updateAvailable && !s.dismissed ? (
                        <button type="button" onClick={s.reload}>
                            Reload — a new version is available
                        </button>
                    ) : null
                }
            </BuildNotifier>
        </BuildNotifierProvider>
    );
}
```

```tsx
// app/layout.tsx  (Server Component)
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
```

`currentBuildId` is required — pass the build ID baked in by `withBuildNotifier` (`process.env.NEXT_PUBLIC_BUILD_ID`).

#### Headless — consume state directly

```tsx
'use client';

import { useBuildNotification } from 'next-build-notifier';

export function UpdateBanner() {
    const { updateAvailable, dismissed, reload, dismiss } = useBuildNotification();

    if (!updateAvailable || dismissed) return null;

    return (
        <div role="alert">
            New version available.
            <button type="button" onClick={reload}>Reload</button>
            <button type="button" onClick={dismiss}>Dismiss</button>
        </div>
    );
}
```

Style it however you want — `next-build-notifier` ships no CSS.

## How detection works

1. At build time `withBuildNotifier` sets `NEXT_PUBLIC_BUILD_ID` to the resolved build ID.
2. `resolveBuildId` determines that value using this precedence:
   `NEXT_DEPLOYMENT_ID` → `VERCEL_DEPLOYMENT_ID` → `GIT_COMMIT_SHA` → `VERCEL_GIT_COMMIT_SHA` → `NEXT_PUBLIC_BUILD_ID` → `BUILD_ID` → the string literal `'development'` when none are set.
3. On the client, `BuildNotifierProvider` checks `/api/version` (or a custom endpoint) on focus/visibility/reconnect, plus every `intervalMs` milliseconds when an interval is set.
4. When the returned build ID differs from the one baked into the bundle, `updateAvailable` flips to `true`.

## Vercel

Vercel's [Skew Protection](https://vercel.com/docs/deployments/skew-protection) pins framework-level requests (RSC payloads, route prefetches) to the deployment that served the page. A plain `fetch` from the browser is **not** pinned — it resolves against the current live deployment. The `/api/version` route leverages this: it always returns the build ID of whichever deployment is currently receiving traffic, so a mismatch between that and the baked-in build ID reliably signals a new release.

`createVersionRoute` responds with `Cache-Control: no-store` so Vercel's CDN never serves a stale response. Add `export const dynamic = 'force-dynamic'` in your route file (as shown in the usage example) so the route renders dynamically rather than freezing the build ID at build time.

## Configuration

| Prop | Type | Default | Notes |
|---|---|---|---|
| `currentBuildId` | `string` | — | Required. The build ID baked into the running client (`process.env.NEXT_PUBLIC_BUILD_ID`). |
| `intervalMs` | `number` | `undefined` | Polling interval in ms. A falsy value (`0` or `undefined`) disables the periodic timer; event triggers (focus/visibility/online) still fire. Pass an explicit value like `60_000` to poll. |
| `endpoint` | `string` | `'/api/version'` | URL of the version route handler. |
| `fetcher` | `function` | built-in | Custom async function that resolves to a `VersionResponse`. |

## Dependencies

This package is intentionally dependency-free — it uses only React, the browser's `fetch`, and standard Web APIs. It does not depend on any Nordcom or third-party error library; errors are plain `Error` instances.

## License

MIT

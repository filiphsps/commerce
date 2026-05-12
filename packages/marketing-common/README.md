# `@nordcom/commerce-marketing-common`

Shared design primitives for the Nordcom Commerce marketing surfaces. Today this is
a single shared [Nordstar](https://www.npmjs.com/package/@nordcom/nordstar) `Theme`
re-used by [`apps/landing`](../../apps/landing) and [`apps/admin`](../../apps/admin) so
the two surfaces look like they belong to the same product.

If you're touching marketing-adjacent UI in more than one app, this is the right
place to put the shared piece.

## Install

```jsonc
{
    "dependencies": {
        "@nordcom/commerce-marketing-common": "workspace:*"
    }
}
```

## Usage

```tsx
import { NordstarProvider } from '@nordcom/nordstar';
import { Theme } from '@nordcom/commerce-marketing-common';

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <NordstarProvider theme={Theme}>
                    {children}
                </NordstarProvider>
            </body>
        </html>
    );
}
```

## Exports

### `Theme: NordstarTheme`

The shared Nordstar theme. Sets brand accents and binds typography to a CSS variable
(`--font-primary`) so each app can plug in its own loaded font.

```ts
{
    accents: {
        primary:   '#ed1e79',
        secondary: '#ed1e79',
    },
    fonts: {
        heading: 'var(--font-primary)',
        body:    'var(--font-primary)',
    },
}
```

Override individual fields if a surface needs to diverge:

```tsx
<NordstarProvider theme={{ ...Theme, accents: { primary: '#000', secondary: '#000' } }}>
```

## Layout

```text
packages/marketing-common/
└── src/
    ├── index.ts        # Public exports — currently just `Theme`
    └── index.test.ts   # Vitest sanity check
```

## Scripts

```bash
pnpm build       # tsc + vite build (emits to dist/)
pnpm typecheck   # tsc -noEmit
pnpm lint        # biome lint .
pnpm clean       # rm dist / .turbo / coverage / etc.
```

Tests run from the repo root with Vitest (`pnpm test`).

## Adding things here

This package is intentionally small. A piece of UI belongs here when:

-   it's used by **two or more** marketing-adjacent apps (today: `apps/landing` and
    `apps/admin`), and
-   it does not depend on commerce state (cart, catalog, locale) — that belongs in
    the storefront.

If it's used by only one app, put it in that app's `src/components/`. If it depends
on `@nordcom/commerce-db` or Shopify, it belongs in the storefront.

# `@nordcom/commerce-shopify-html`

Convert Shopify rich-text HTML — the kind you get back from
`product.descriptionHtml`, `metafield.value`, blog `contentHtml`, and so on — into
either a React tree or a plain-text string.

Built on top of [`node-html-parser`](https://www.npmjs.com/package/node-html-parser).
No `dangerouslySetInnerHTML`. No DOM dependency, so it works in Node, the edge runtime,
and the browser.

## Why

Shopify hands you arbitrary HTML in lots of fields. Two things you almost always want
to do with it:

1.  Render it inside your React tree with your own components (e.g. swap `<a>` for
    `next/link`, `<img>` for `next/image`, `<h2>` for your typography component).
2.  Project it to a clean text string for `<title>`, meta descriptions, OG tags, JSON-LD,
    Algolia indexing, etc.

This package gives you both, with consistent normalization in front.

## Install

```jsonc
{
    "dependencies": {
        "@nordcom/commerce-shopify-html": "workspace:*"
    },
    "peerDependencies": {
        "react": "^19.0.0"
    }
}
```

## Usage

### `toReactNodes`

Render Shopify HTML as a React tree:

```tsx
import { toReactNodes } from '@nordcom/commerce-shopify-html';
import Link from 'next/link';
import Image from 'next/image';

export function ProductDescription({ html }: { html: string }) {
    return (
        <article>
            {toReactNodes(html, {
                components: {
                    a: Link,
                    img: Image,
                    h2: MyHeading,
                },
            })}
        </article>
    );
}
```

Anything not in `components` falls back to the original HTML tag. Attributes get
JSX-renamed where required (`class` → `className`, `for` → `htmlFor`, `tabindex` →
`tabIndex`, …), so swapping components Just Works.

#### Options

```ts
type ToReactNodesOptions = {
    /** Override which component to render for a given tag. */
    components?: Partial<Record<keyof JSX.IntrinsicElements, ElementType>>;
};
```

### `toPlainText`

Project Shopify HTML to plain text:

```ts
import { toPlainText } from '@nordcom/commerce-shopify-html';

const subtitle = toPlainText(product.descriptionHtml);
//             → "Hand-made wool blanket. Ships in 2–3 days."
```

Block-level tags (`<p>`, `<div>`, `<li>`, `<h1…6>`, `<br>`, `<tr>`, `<td>`,
`<th>`, `<blockquote>`) introduce line breaks; inline tags don't. Useful for
`<title>`, `<meta name="description">`, OG tags, and structured data.

## Normalization

Both helpers run input through `normalize()` first (also exported as
`@nordcom/commerce-shopify-html/normalize`). The normalizer:

-   Returns `null` for `null` / `undefined` / empty / whitespace-only input.
-   Strips `<meta>`, `<script>`, and `<style>` elements outright.
-   Drops every `data-*` attribute.
-   Collapses non-breaking spaces — both raw `U+00A0` and `&nbsp;` entities — to
    regular spaces.
-   Trims outer whitespace.

This means you don't have to defensively sanitize Shopify output at every call site
— the package does it once, predictably.

## Layout

```text
packages/shopify-html/
└── src/
    ├── index.ts             # Public exports
    ├── normalize.ts         # Parse + normalize Shopify HTML
    ├── to-plain-text.ts     # HTML → plain text
    ├── to-react-nodes.tsx   # HTML → React tree (with component overrides)
    └── *.test.{ts,tsx}      # Vitest suites
```

## Scripts

```bash
pnpm build       # tsc + vite build (emits to dist/)
pnpm typecheck   # tsc -noEmit
pnpm lint        # biome lint .
pnpm test        # vitest run
pnpm clean       # rm dist / .turbo / coverage / etc.
```

## Notes

-   No `dangerouslySetInnerHTML` is used. Output is a real React tree of
    `React.createElement` calls, so refs, keys, and component swaps all behave normally.
-   This package only knows about HTML — it's not a Markdown parser, and it does no
    sanitization beyond the normalization steps above. Treat Shopify HTML as trusted
    input from your own store; do not feed it untrusted third-party HTML.

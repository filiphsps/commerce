---
title: Blocks
sidebar_position: 3
---

# Blocks

Pages and articles store their body as an array of typed block nodes, defined in
`src/blocks/` and rendered by `BlockRenderer` (`src/blocks/render/`).

## Block types

| Block        | File                          | Loader required? |
| ------------ | ----------------------------- | ---------------- |
| `alert`      | `src/blocks/alert.ts`         | no               |
| `banner`     | `src/blocks/banner.ts`        | no               |
| `html`       | `src/blocks/html.ts`          | no               |
| `media-grid` | `src/blocks/media-grid.ts`    | no               |
| `rich-text`  | `src/blocks/rich-text.ts`     | no               |
| `columns`    | `src/blocks/columns.ts`       | no (recurses)    |
| `collection` | `src/blocks/collection.ts`    | `loadCollection` |
| `vendors`    | `src/blocks/vendors.ts`       | `loadVendors`    |
| `overview`   | `src/blocks/overview.ts`      | `loadOverview`   |

Block node types live in `src/blocks/render/types.ts` and form a discriminated
union on `blockType`:

```ts
export type BlockNode =
    | RichTextBlockNode
    | AlertBlockNode
    | HtmlBlockNode
    | MediaGridBlockNode
    | BannerBlockNode
    | CollectionBlockNode
    | VendorsBlockNode
    | OverviewBlockNode
    | ColumnsBlockNode;
```

## `<BlockRenderer />`

```tsx
import { BlockRenderer } from '@nordcom/commerce-cms/blocks/render';

<BlockRenderer
    blocks={page.blocks}
    context={{
        shop,
        locale,
        loaders: {
            loadCollection,   // → ShopifyCollectionSummary | null
            loadVendors,      // → ShopifyVendorSummary[]
            loadOverview,     // → ShopifyProductSummary[]
        },
    }}
/>;
```

`BlockRenderer` switches on `block.blockType` and recurses through nested
`columns` blocks up to `MAX_DEPTH = 6`. Above that depth it renders `null`,
which gives the editor a hard ceiling without throwing.

## The loader contract

The three Shopify-aware blocks (`collection`, `vendors`, `overview`) call out to
loaders that the consumer injects via `context.loaders`. The loader signatures
are:

```ts
export type BlockLoaders = {
    loadCollection: (args: {
        shop: Shop;
        locale: LocaleRef;
        handle: string;
        limit: number;
    }) => Promise<ShopifyCollectionSummary | null>;

    loadVendors: (args: {
        shop: Shop;
        locale: LocaleRef;
        limit: number;
    }) => Promise<ShopifyVendorSummary[]>;

    loadOverview: (args: {
        shop: Shop;
        locale: LocaleRef;
        source: 'collection' | 'latest' | 'featured';
        handle?: string;
        limit: number;
    }) => Promise<ShopifyProductSummary[]>;
};
```

The CMS package never imports `@shopify/*`. The storefront supplies the actual
loader implementations on top of its `AbstractApi`. This is the seam that keeps
the CMS deployable without a Shopify dependency.

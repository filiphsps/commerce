---
title: Data Fetching
sidebar_position: 3
---

# Data fetching pattern

All Shopify queries go through `AbstractApi` (`src/utils/abstract-api.ts`). Build one
via `ShopifyApolloApiClient({ shop, locale })` (or the public variant). **Never call
Apollo directly from a route.**

```ts
import { ShopifyApolloApiClient } from '@/api/shopify';

const api = await ShopifyApolloApiClient({ shop, locale });
const product = await api.query(/* GraphQL */ PRODUCT_QUERY, { handle });
```

The `@inContext(country, language)` directive is injected automatically by the Apollo
`DocumentTransform` from `@nordcom/commerce-shopify-graphql`. Source operations must
**not** pre-declare `@inContext`, `$country`, or `$language` — the transform owns them
and will throw `DuplicateContextDirectiveError` / `DuplicateContextVariableError` if
they're present.

## Cache tags

Cache tags follow `buildCacheTagArray(shop, locale, [...extra])`:

```
['shopify', 'shopify.<shopId>', '<domain>', '<localeCode>', ...]
```

Per-entity tags use `shopify.<shopId>.product.<handle>` and
`shopify.<shopId>.collection.<handle>` so revalidation can be surgical.

## CMS

CMS access goes through `@nordcom/commerce-cms/api`:

```ts
import { getPage as CmsGetPage } from '@nordcom/commerce-cms/api';

const page = await CmsGetPage({ shop, locale, handle });
```

`src/api/page.ts` is the storefront-level dispatcher that returns either a
`cms`- or `shopify`-provider page; `<CMSContent>` renders block trees via the
`BlockRenderer` from `@nordcom/commerce-cms/blocks/render`, with Shopify-aware
loaders injected from `src/cms-loaders.ts`.

Payload generates TS types for the CMS schema; run
`pnpm --filter @nordcom/commerce-cms generate:types` after any collection-field
change to refresh `packages/cms/src/types/payload-types.ts`.

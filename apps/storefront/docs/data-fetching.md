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

## Prismic

Prismic access goes through `createClient({ shop, locale })` in
`src/utils/prismic.tsx`. Slices live under `src/slices/` and are managed via
Slicemachine. Generated types land in `prismicio-types.d.ts` — don't hand-edit
this file.

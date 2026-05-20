---
title: API
sidebar_position: 2
---

# Query API

The package's `./api` subpath exposes a small, typed read API on top of Payload's
Local API. Every reader is `'server-only'`, takes `{ shop, locale, draft? }`, and
returns the first matching doc (or `null`).

```ts
import {
    getPage,
    getArticle,
    getArticles,
    getHeader,
    getFooter,
    getBusinessData,
    getProductMetadata,
    getCollectionMetadata,
    resolveLink,
    getPayloadInstance,
} from '@nordcom/commerce-cms/api';
```

## Shape of a reader

All single-doc readers (`getPage`, `getArticle`, `getHeader`, …) follow the same
template: tenant-scope on `shop.id`, apply the locale, fall back to the shop's
default locale, depth 2, limit 1.

```ts
export type GetPageArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    slug: string;
    draft?: boolean;
    /** Test seam — pass a pre-booted Payload instance. */
    __payload?: Payload;
};

export const getPage = async ({ shop, locale, slug, draft = false, __payload }: GetPageArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const { docs } = await payload.find({
        collection: 'pages',
        where: { and: [{ tenant: { equals: shop.id } }, { slug: { equals: slug } }] },
        locale: locale.code,
        fallbackLocale: shop.i18n.defaultLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
```

The `__payload` test seam exists so integration tests can swap in an isolated
Payload instance booted by `bootTestPayload({ suite })`. In production every
reader resolves through the shared `getPayloadInstance()`.

## `getPayloadInstance()`

```ts
import { getPayloadInstance } from '@nordcom/commerce-cms/api';

const payload = await getPayloadInstance();
```

Returns the singleton `Payload` instance for this process. Booted lazily on first
call with `includeAdmin: false`, so the storefront pays no admin-UI cost. Every
subsequent call resolves to the same instance — no second Mongo connection.

## `resolveLink`

Turns the CMS `linkField` shape into a storefront URL.

```ts
import { resolveLink } from '@nordcom/commerce-cms/api';

resolveLink({ kind: 'page', page: { slug: 'about' } }, { locale }); // → /en-US/about/
resolveLink({ kind: 'product', product: { shopifyHandle: 'hat' } }, { locale });
//   → /en-US/products/hat/
```

Supports `external`, `anchor`, `page`, `article`, `product`, and `collection`
link kinds. The render-time `LinkRef` shape (in `blocks/render/types.ts`) carries
loose values for editor-side defaults; the loader pipeline coerces them into the
strict `LinkValue` shape before calling `resolveLink`.

## Cache invalidation

CMS-side `afterChange` hooks call `revalidateTag` with three tags per mutation:

```text
cms.<tenantId>.<collection>.<key>   # e.g. cms.shop-1.pages.home
cms.<tenantId>.<collection>         # e.g. cms.shop-1.pages
cms.<tenantId>                      # broad sweep for the whole tenant
```

`<key>` is the slug for `pages`/`articles`, the `shopifyHandle` for
product/collection metadata, or the doc id for globals. Storefront read paths
attach all three tags so a single edit invalidates exactly what changed without
sweeping the whole site.

For tenant-root reads that aren't entity-specific (e.g. sitemap indexes), use
`cmsTenantRootTags(shop)` from `@nordcom/commerce-cms/cache` to get the matching
fanout tags.

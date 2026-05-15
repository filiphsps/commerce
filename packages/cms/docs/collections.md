---
title: Collections
sidebar_position: 4
---

# Collections

All Payload collections live under `src/collections/`. `allCollections` is the
ordered array passed to `buildPayloadConfig`; `tenantScopedCollections` and
`globalLikeCollections` describe how the multi-tenant plugin treats each one.

| Collection           | File                                          | Notes                                                                 |
| -------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `tenants`            | `src/collections/tenants.ts`                  | Internal — synced from `Shop` via `attachShopSync`.                   |
| `users`              | `src/collections/users.ts`                    | Editor accounts; auth strategies wired in via `buildUsers`.           |
| `media`              | `src/collections/media.ts`                    | Image uploads; backed by S3 when the `S3_*` env block is set.         |
| `pages`              | `src/collections/pages.ts`                    | Slug + blocks. Drafts + autosave at 2s.                               |
| `articles`           | `src/collections/articles.ts`                 | Slug + body. Drafts.                                                  |
| `productMetadata`    | `src/collections/product-metadata.ts`         | Per-`shopifyHandle` SEO/marketing overrides.                          |
| `collectionMetadata` | `src/collections/collection-metadata.ts`      | Per-`shopifyHandle` overrides for Shopify collections.                |
| `header`             | `src/collections/_globals/header.ts`          | `isGlobal` — one row per tenant.                                      |
| `footer`             | `src/collections/_globals/footer.ts`          | `isGlobal` — one row per tenant.                                      |
| `businessData`       | `src/collections/_globals/business-data.ts`   | `isGlobal` — addresses, phone, support email, etc.                    |

Three collections (`header`, `footer`, `businessData`) are modelled as
singleton-like rows under `@payloadcms/plugin-multi-tenant`'s `isGlobal: true`
flag; the plugin treats them as one row per tenant from the UI but they live in
the normal collection store.

## Access predicates

```ts
import {
    tenantScopedRead,
    tenantScopedWrite,
    adminOnly,
    publicRead,
    publishedOrAuthRead,
    isTenantMember,
    isAdmin,
} from '@nordcom/commerce-cms/access';
```

| Predicate                | Anonymous reader sees       | Editor with `tenants` sees | Admin sees |
| ------------------------ | --------------------------- | -------------------------- | ---------- |
| `publicRead`             | everything                  | everything                 | everything |
| `tenantScopedRead`       | `_status: 'published'` only | own tenants                | everything |
| `publishedOrAuthRead`    | `_status: 'published'` only | everything                 | everything |
| `tenantScopedWrite`      | n/a                         | own tenants                | everything |
| `adminOnly`              | n/a                         | nothing                    | everything |
| `isTenantMember()`       | nothing                     | own tenants                | everything |

Drop them into a `CollectionConfig['access']` block:

```ts
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '@nordcom/commerce-cms/access';

export const pages: CollectionConfig = {
    slug: 'pages',
    access: {
        read: tenantScopedRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    // …
};
```

## Revalidation hooks

`buildRevalidateHooks({ collection })` plugs the `@tagtree/payload` adapter into
a collection's `hooks` block. Every `afterChange` / `afterDelete` fan-outs the
three CMS cache tags (`cms.<tenant>.<collection>.<key>` /
`cms.<tenant>.<collection>` / `cms.<tenant>`).

```ts
import { buildRevalidateHooks } from './_hooks/revalidate';

export const pages: CollectionConfig = {
    // …
    hooks: buildRevalidateHooks({ collection: 'pages' }),
};
```

## Shop → tenant sync

`attachShopSync` listens on the Mongoose `Shop` model's `post('save')` and
upserts the matching `tenants` doc so creating a shop in admin immediately makes
a tenant available in the CMS:

```ts
import { Shop } from '@nordcom/commerce-db';
import { attachShopSync } from '@nordcom/commerce-cms/shop-sync';
import { getPayloadInstance } from '@nordcom/commerce-cms/api';

attachShopSync(Shop.model, getPayloadInstance);
```

The hook is idempotent — repeated `attachShopSync` calls (Next.js hot reload,
retried boot, multiple `getPayload` callers) won't stack duplicate listeners.
Sync uses `overrideAccess: true` because it runs from a Mongoose post-save hook
outside any HTTP request, where there is no `req.user` for the
`adminOnly`-gated `tenants.create` predicate to inspect.

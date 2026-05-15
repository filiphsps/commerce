---
title: Overview
sidebar_position: 1
---

# commerce-cms

Multi-tenant CMS built on Payload 3.x. Embedded into `apps/admin` as the editor
UI (`/cms`) and consumed by `apps/storefront` for the read side through Payload's
Local API and a typed `<BlockRenderer />`.

> **Server-only.** The query API (`@nordcom/commerce-cms/api`) and the cache
> module (`@nordcom/commerce-cms/cache`) are marked `'server-only'` and call into
> Payload's Local API directly. Don't import them from client components.

For the canonical reference, see the [README on GitHub](https://github.com/filiphsps/commerce/blob/master/packages/cms/README.md).

## Why

A single deployment serves many tenants, and each tenant needs its own pages,
articles, navigation, business data, and per-product/collection metadata. This
package exists so the platform has exactly one canonical Payload config:

- **One schema, many tenants.** All content collections carry a `tenant`
  relation and are filtered by `@payloadcms/plugin-multi-tenant`. Access
  predicates make the tenant boundary a hard wall — admins see everything,
  editors see only their shops, public reads see only published docs.
- **Shopify-aware blocks, no Shopify dependency in the CMS.** The block model is
  defined here; data loaders for `collection` / `vendors` / `overview` blocks
  are injected by the storefront at the `BlockRenderer` boundary.
- **One Payload instance.** `getPayloadInstance()` returns a memoized `Payload`
  that the storefront's read paths reuse — no separate DB connection per route.
- **Cache invalidation by construction.** Every content collection's
  `afterChange` / `afterDelete` hooks fan out `revalidateTag` calls on the
  `@tagtree/payload` adapter, so a single mutation flushes exactly the
  per-tenant, per-collection, per-handle tags the storefront read.

## In this section

- **Overview** — this page
- **API** — server-only read API (`getPage`, `getArticle`, `getHeader`, …)
- **Blocks** — block model and the `BlockRenderer` dispatch component
- **Collections** — Payload collections and the access-predicate toolbox
- **[API Reference](/docs/cms/api/)** — auto-generated from TypeScript source

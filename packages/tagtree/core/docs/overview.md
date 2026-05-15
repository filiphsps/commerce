---
title: Overview
sidebar_position: 1
---

# @tagtree/core

Typed, hierarchical, framework-agnostic tagged-cache for server-side caching.

For the canonical reference, see the
[README on GitHub](https://github.com/filiphsps/commerce/blob/master/packages/tagtree-core/README.md).

## What it solves

Server-side caches benefit from invalidation by tag — Next.js's `revalidateTag`,
Cloudflare's `Cache-Tag` header, and similar primitives across platforms. Without
a shared abstraction, every call site ends up hand-rolling tag strings like
`shopify.${shop.id}.product.${handle}`, and every webhook handler ends up
hand-rolling the matching fanout. Typos break invalidation silently.

`tagtree` declares the tag shape once as a typed schema, then generates
builders, invalidators, and a plugin contract from it. Emitters and
invalidators talk to the same schema — string concatenation disappears
from user code.

## Sister packages

- [`@tagtree/next`](/docs/tagtree-next/overview/) — Next.js storage adapter
- [`@tagtree/shopify`](/docs/tagtree-shopify/overview/) — Shopify webhook → tag mapper
- [`@tagtree/payload`](/docs/tagtree-payload/overview/) — Payload CMS hook factory

## In this section

- **Overview** — this page
- **API** — auto-generated TypeDoc reference for the public surface

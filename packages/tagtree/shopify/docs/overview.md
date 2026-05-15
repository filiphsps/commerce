---
title: Overview
sidebar_position: 1
---

# @tagtree/shopify

Shopify webhook plugin for [`@tagtree/core`](/docs/tagtree-core/overview/). Verifies
incoming HMAC signatures and maps webhook topics to tag arrays that match
the user's cache schema.

For the canonical reference, see the
[README on GitHub](https://github.com/filiphsps/commerce/blob/master/packages/tagtree/shopify/README.md).

## Topics covered

- `products/{create,update,delete}`
- `collections/{create,update,delete}`
- `pages/{create,update,delete}`

Other topics return an empty tag array — the caller decides whether to
broad-sweep at the tenant root.

## Schema-aware

The parser never invents tags. If the consumer's schema declares
`product` and `collection` but not `page`, then `pages/*` webhooks
return `[]` instead of firing a `page` tag that no read path uses.

## In this section

- **Overview** — this page
- **API** — auto-generated TypeDoc reference for the public surface

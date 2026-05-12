---
title: Overview
sidebar_position: 1
---

# commerce-shopify-graphql

Apollo `DocumentTransform` that injects Shopify's `@inContext(country, language)`
directive into every operation, plus the corresponding `$country` / `$language`
variable definitions.

For the canonical reference, see the [README on GitHub](https://github.com/filiphsps/commerce/blob/master/packages/shopify-graphql/README.md).

## Why

The Shopify Storefront API uses the `@inContext` directive to scope responses to a
country and language. Every query and mutation in a multi-tenant storefront needs it,
but adding it by hand is repetitive and error-prone. This transform hooks into Apollo
Client's `documentTransform` pipeline and does it once, at the network layer, for
every request.

## In this section

- **Overview** — this page
- **[API Reference](/docs/shopify-graphql/api/)** — auto-generated from TypeScript source

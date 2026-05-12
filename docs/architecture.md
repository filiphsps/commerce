---
title: Architecture
sidebar_position: 2
---

# Architecture

Nordcom Commerce is a single Next.js deployment that serves many tenants. Tenants are
resolved by hostname in middleware before any page renders.

## Request flow

1. The Next.js middleware (`apps/storefront/src/proxy.ts`) is the entry.
2. It dispatches to `admin()` or `storefront()` based on the first path segment.
3. `storefront()` reads `req.headers.host`, normalizes it (strips ports, `.localhost`,
   Vercel preview suffixes), and calls `Shop.findByDomain(hostname)` against MongoDB.
4. On a hit, the resolved domain is injected into the URL, so the App Router serves
   the page from `apps/storefront/src/app/[domain]/[locale]/…`.
5. On `NotFoundError`, the middleware rewrites to `SERVICE_DOMAIN/status/unknown-shop/`.

## Data layer

All Mongo access goes through `@nordcom/commerce-db`. See the **db** section for details.

## Commerce + content

Shopify Storefront/Admin APIs and Prismic CMS sit behind `AbstractApi` and
`createClient` respectively. See the **Storefront** section for details.

## Errors

A shared, code-tagged error hierarchy. See the **errors** section for details.

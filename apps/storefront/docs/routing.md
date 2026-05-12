---
title: Routing
sidebar_position: 2
---

# Multi-tenant routing

`apps/storefront/src/proxy.ts` is the Next.js middleware entry. The flow is:

1. Dispatch — paths starting with `/admin` go to `admin()` (see `src/middleware/admin.ts`),
   everything else goes to `storefront()` (`src/middleware/storefront.ts`).
2. `storefront()` reads `req.headers.host`, normalizes it (strips ports, `.localhost`,
   Vercel preview suffixes), then calls `Shop.findByDomain(hostname)` against MongoDB.
3. On a hit, the resolved domain is injected into the URL so the App Router serves the
   page from `src/app/[domain]/[locale]/…`.
4. On `NotFoundError`, the middleware rewrites to `SERVICE_DOMAIN/status/unknown-shop/`.
   Other commerce errors → `/status/unknown-error/`.
5. Unknown hosts in dev/preview fall back to `swedish-candy-store.com` so contributors
   can boot without seeding their own tenant.

When adding routes, place them under `src/app/[domain]/[locale]/…` — **not** at the
root. The `[domain]/api/…` segment is reserved for tenant-scoped API endpoints.

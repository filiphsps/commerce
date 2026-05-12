---
title: Webhooks
sidebar_position: 4
---

# Cache invalidation / webhooks

`/[domain]/api/revalidate` accepts both Shopify and Prismic webhooks:

- **Shopify** path verifies `X-Shopify-Hmac-SHA256` via
  `validateShopifyHmac()` (`src/utils/webhooks/shopify.ts`), maps the topic to
  per-entity tags (`parseShopifyWebhook`), and calls `revalidateTag(tag, 'max')`.
  If `SHOPIFY_WEBHOOK_SECRET` is unset, validation is skipped with a warning
  (dev only — never deploy without it).
- **Prismic** path is detected by the `documents` array in the body and maps each
  document to tags via `parsePrismicWebhook`.

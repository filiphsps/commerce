---
title: Webhooks
sidebar_position: 4
---

# Cache invalidation / webhooks

`/[domain]/api/revalidate` accepts Shopify webhooks:

- **Shopify** path verifies `X-Shopify-Hmac-SHA256` via
  `validateShopifyHmac()` (`src/utils/webhooks/shopify.ts`), maps the topic to
  per-entity tags (`parseShopifyWebhook`), and calls `revalidateTag(tag, 'max')`.
  If `SHOPIFY_WEBHOOK_SECRET` is unset, validation is skipped with a warning
  (dev only — never deploy without it).

CMS invalidation runs from the Payload collection `afterChange` hooks in
`@nordcom/commerce-cms`, which call `revalidateTag` directly — no webhook needed.

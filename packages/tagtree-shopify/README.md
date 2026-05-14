# @tagtree/shopify

Shopify webhook plugin for `@tagtree/core` — HMAC verification and schema-aware
topic-to-tag mapping.

When Shopify fires a webhook for a product update, deletion, or creation, you
need to map that event to the exact cache tags that cover the changed resource.
`@tagtree/shopify` does that mapping against your schema so you never invalidate
a tag that doesn't exist on the read side, and never miss a tag that does.

> Part of the `@tagtree/*` suite. See
> [`@tagtree/core`](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-core#readme)
> for schema definition, key builders, and the full concept guide.

## Install

No additional peer dependencies — this package only depends on `@tagtree/core`
and Node's built-in `crypto` module.

```sh
pnpm add @tagtree/shopify @tagtree/core
npm install @tagtree/shopify @tagtree/core
```

## `verifyShopifyHmac(rawBody, headerHmac, secret)`

Verifies the `X-Shopify-Hmac-SHA256` header against the raw request body using
a timing-safe comparison.

```ts
import { verifyShopifyHmac } from '@tagtree/shopify';

const rawBody = await request.text();
const hmac = request.headers.get('x-shopify-hmac-sha256'); // may be null

if (!verifyShopifyHmac(rawBody, hmac, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
    return new Response('Unauthorized', { status: 401 });
}
```

- `headerHmac` accepts `string | null`. A `null` header (missing or unsupported)
  returns `false` without throwing.
- The comparison uses `timingSafeEqual` to prevent timing attacks.
- The HMAC is computed over the raw UTF-8 body bytes using SHA-256, then
  base64-encoded — matching Shopify's documented signing format.

## `parseShopifyWebhook({ schema, tenant, topic, body })`

Maps a verified Shopify webhook to a tagtree tag array.

```ts
import { parseShopifyWebhook } from '@tagtree/shopify';

const topic = request.headers.get('x-shopify-topic') ?? '';
const body = JSON.parse(rawBody) as Record<string, unknown>;

const tags = parseShopifyWebhook({
    schema: shopCache,          // your defineCache(...) result
    tenant: shop,               // the resolved tenant for this shop
    topic,                      // e.g. 'products/update'
    body,                       // parsed JSON body
});
```

Returns `string[]` — the full fanout tag array for the event. Pass this directly
to `cache.invalidateRaw(tags)`.

## Topic → entity mapping

| Shopify topic | Entity | Param read from body |
|---------------|--------|----------------------|
| `products/update` | `product` | `handle` |
| `products/delete` | `product` | `handle` |
| `products/create` | `product` | `handle` |
| `collections/update` | `collection` | `handle` |
| `collections/delete` | `collection` | `handle` |
| `collections/create` | `collection` | `handle` |
| `pages/update` | `page` | `handle` |
| `pages/delete` | `page` | `handle` |
| `pages/create` | `page` | `handle` |

Unknown topics return `[]`.

## Schema awareness

`parseShopifyWebhook` checks whether the entity named in the mapping (`product`,
`collection`, `page`) is declared in your schema before emitting any tags. If your
schema does not have a `collection` entity, a `collections/update` webhook returns
`[]` rather than inventing a tag that has no corresponding cached entries. This
prevents phantom invalidations from leaking into production.

## Empty-result handling

When `parseShopifyWebhook` returns `[]` (unknown topic or undeclared entity), it
is the caller's responsibility to decide what to do. The safest fallback is a
tenant-wide invalidation:

```ts
if (tags.length > 0) {
    await cache.invalidateRaw(tags);
} else {
    // Unknown topic — sweep everything for this shop.
    await cache.invalidate.tenant(shop);
}
```

## Full webhook route example

```ts
// app/[domain]/api/revalidate/route.ts (Next.js App Router)
import { verifyShopifyHmac, parseShopifyWebhook } from '@tagtree/shopify';
import { cache, shopCache } from '@/lib/cache';
import { resolveShop } from '@/lib/shop';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { domain: string } }) {
    const rawBody = await req.text();
    const hmac = req.headers.get('x-shopify-hmac-sha256');
    const topic = req.headers.get('x-shopify-topic') ?? '';

    if (!verifyShopifyHmac(rawBody, hmac, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
        return new Response('Unauthorized', { status: 401 });
    }

    const shop = await resolveShop(params.domain);
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    const tags = parseShopifyWebhook({ schema: shopCache, tenant: shop, topic, body });

    if (tags.length > 0) {
        await cache.invalidateRaw(tags);
    } else {
        await cache.invalidate.tenant(shop);
    }

    return new Response('OK');
}
```

## License

MIT — see [repository](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-shopify).

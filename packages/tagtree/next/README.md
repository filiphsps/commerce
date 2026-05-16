# @tagtree/next

Next.js adapter for `@tagtree/core` — delegates `wrap` to `unstable_cache` and
`invalidate` to `revalidateTag`.

Next.js manages its own opaque data cache keyed by the arguments passed to
`unstable_cache`. There is no public API for reading from or writing to that cache
directly, so the standard tagtree read/write cycle does not apply here.
`nextAdapter` instead delegates the entire `wrap` round-trip to `unstable_cache`
(which handles deduplication, persistence across requests, and tag-based CDN
headers) and maps `invalidate` straight to `revalidateTag('tag', 'max')`.

> Part of the `@tagtree/*` suite. See
> [`@tagtree/core`](https://github.com/filiphsps/commerce/tree/master/packages/tagtree/core#readme)
> for schema definition, key builders, and the full concept guide.

## Install

Requires Next.js 16 or later as a peer dependency.

```sh
pnpm add @tagtree/next @tagtree/core
npm install @tagtree/next @tagtree/core
```

## Usage

```ts
import { defineCache, createCacheInstance, str } from '@tagtree/core';
import { nextAdapter } from '@tagtree/next';

type OnlineShop = { id: string };
type Locale = { code: string };

const shopCache = defineCache({
    namespace: 'shopify',
    tenant: { type: {} as OnlineShop, key: (shop) => shop.id },
    qualifier: { type: {} as Locale, key: (locale) => locale.code },
    entities: {
        product: { params: { handle: str }, parents: ['products'] },
        products: {},
    },
});

// Create the instance once (e.g., in a lib/ singleton module).
export const cache = createCacheInstance(shopCache, nextAdapter());

// In a Server Component or route handler:
const shop: OnlineShop = { id: 'gid://shopify/Shop/1' };
const locale: Locale = { code: 'en-US' };

const product = await cache.wrap(
    cache.keys.product({ tenant: shop, qualifier: locale, handle: 'gummy-bears' }),
    () => fetchFromShopify('gummy-bears'),
    { ttl: 3600 },
);

// In a webhook route handler:
await cache.invalidate.product({ tenant: shop, handle: 'gummy-bears' });
```

## Behavior notes

- **`read`** always returns `undefined`. Next's data cache is not readable from
  outside `unstable_cache`; `wrap` is the only supported entry point.
- **`write`** is a no-op for the same reason.
- **`wrap`** calls `unstable_cache(fetcher, [key], { tags, revalidate: opts.ttl })`
  and invokes the resulting function. This is where the cached result actually lives.
- **`invalidate`** calls `revalidateTag(tag, 'max')` for each tag in the array.
  The `'max'` scope purges both the Next.js data cache and any upstream CDN cache
  that received the tag via `Cache-Tag` headers.
- This adapter is marked `server-only` and will throw at import time in a Client
  Component.

## License

MIT — see [repository](https://github.com/filiphsps/commerce/tree/master/packages/tagtree/next).

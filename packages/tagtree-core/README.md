# @tagtree/core

Schema-driven, tenant-aware cache tag management for multi-tenant applications.

Most cache tag libraries are stringly-typed: you mint strings at write time and
hope you remember the right strings at invalidation time. Tagtree inverts this.
You declare a schema once — namespace, tenant shape, qualifier, entities and their
params — and the library derives every tag string from that schema. `cache.keys`
gives you typed builders that produce `CacheKey` objects; `cache.invalidate`
gives you typed invalidators that flush exactly the right set of tags. Typos and
missing entity fanout become compile errors, not cache poisoning.

> **Status:** Private OSS, `0.0.1`. The public API is not stable pre-1.0.
> Breaking changes may land on any minor bump.

## Install

```sh
pnpm add @tagtree/core
npm install @tagtree/core
```

## Quick start

```ts
import { defineCache, createCacheInstance, memoryAdapter, str } from '@tagtree/core';

// 1. Declare the schema
type OnlineShop = { id: string; domain: string };
type Locale     = { code: string };

const shopCache = defineCache({
    namespace: 'shopify',
    tenant: {
        type: {} as OnlineShop,
        key: (shop) => shop.id,
        extraTags: (shop) => [shop.domain],
    },
    qualifier: {
        type: {} as Locale,
        key: (locale) => locale.code,
    },
    entities: {
        product: {
            params: { handle: str },
            parents: ['products'],
        },
        products: {},
        collection: {
            params: { handle: str },
            parents: ['collections'],
        },
        collections: {},
    },
});

// 2. Create an instance backed by an adapter
const cache = createCacheInstance(shopCache, memoryAdapter());

// 3. Wrap a fetch
const shop: OnlineShop = { id: 'gid://shopify/Shop/1', domain: 'swedish-candy-store.com' };
const locale: Locale = { code: 'en-US' };

const product = await cache.wrap(
    cache.keys.product({ tenant: shop, qualifier: locale, handle: 'gummy-bears' }),
    () => fetchProductFromShopify('gummy-bears'),
    { ttl: 3600 },
);

// 4. Invalidate on a webhook
await cache.invalidate.product({ tenant: shop, handle: 'gummy-bears' }); // leaf + collection + tenant
await cache.invalidate.products({ tenant: shop });                        // entire product collection
await cache.invalidate.tenant(shop);                                      // everything for this tenant
await cache.invalidate.all();                                             // nuke the namespace
```

## Core concepts

Tagtree is built from four primitives:

| Primitive | What it is |
|-----------|-----------|
| **Schema** | A static description of your namespace, tenant shape, optional qualifier, and every cacheable entity. Created with `defineCache`. |
| **Cache instance** | A runtime object (`CacheInstance`) that combines a schema with an adapter. Created with `createCacheInstance`. |
| **Adapter** | Implements `read / write / invalidate` (and optionally `wrap`) against a specific storage backend. |
| **Plugin** | A framework- or service-specific helper (e.g., `@tagtree/next`, `@tagtree/shopify`) that either produces an adapter or maps external events to tagtree tags. |

## Schema API

### `defineCache(input)`

```ts
import { defineCache, str, num } from '@tagtree/core';

const schema = defineCache({
    namespace: 'shopify',         // top-level tag prefix; cannot contain "."
    tenant: {
        type: {} as OnlineShop,   // phantom type — not used at runtime
        key: (shop) => shop.id,   // string used as the tenant segment in every tag
        extraTags: (shop) => [shop.domain], // additional tenant-level tags (e.g., alias domains)
    },
    qualifier: {
        type: {} as Locale,
        key: (locale) => locale.code, // appended as "::en-US" to the readTag
    },
    entities: {
        product: {
            params: { handle: str },     // typed params; str = Brand<string>, num = Brand<number>
            parents: ['products'],       // parent entities whose collection tags are also emitted
        },
        products: {},                    // paramless entity (collection-level only)
    },
});
```

**Brand types** (`str`, `num`) are phantom markers used in entity `params`. They
constrain the `KeyBuilderArg` type so TypeScript catches passing a number where a
string handle is expected.

**Tenant** is optional. Without it, all tags live directly under the namespace
root and are shared across all tenants — suitable for single-tenant deployments.

**Qualifier** is optional. When present, the key-builder appends `::${qualifierKey}`
to the `readTag` (the cache lookup key) without changing the invalidation fanout.
This lets you cache the same resource in multiple locales while invalidating all
locales together.

**Parents** declare wider cache scopes that should be flushed when this entity
changes. A product belongs to the `products` collection; flushing the product also
flushes `products`.

## `cache.keys.<entity>(...)`

```ts
const key = cache.keys.product({
    tenant: shop,
    qualifier: locale,
    handle: 'gummy-bears',
});

// key.primary  → 'shopify.gid%3A%2F%2Fshopify%2FShop%2F1.product.gummy-bears'
// key.readTag  → 'shopify....product.gummy-bears::en-US'  (primary + qualifier)
// key.tags     → [leaf, entity-collection, parent, extraTags..., tenant-root, namespace-root]
```

`CacheKey` has three fields:

- `primary` — the most-specific tag, deepest leaf. Used in logs.
- `readTag` — cache lookup key; equals `primary` with qualifier appended.
- `tags` — the full fanout array, deepest to shallowest, used when writing to the
  cache so that any of those tags can invalidate the entry.

Segments are dot-joined after being URL-encoded (`.` → `%2E`, `:` → `%3A`).

## `cache.wrap(key, fetcher, opts?)`

The cache-aside primitive. On a cache miss, calls `fetcher`, writes the result
tagged with `key.tags`, and returns it. On a hit, returns the stored value.

```ts
const data = await cache.wrap(
    cache.keys.product({ tenant: shop, handle: 'gummy-bears' }),
    () => fetchProductFromShopify('gummy-bears'),
    { ttl: 3600, swr: true, stalenessGuard: true },
);
```

`WrapOpts`:
- `ttl` — seconds until the entry expires. `undefined` = no expiry.
- `swr` — hint to the adapter to serve stale while revalidating (adapter-dependent).
- `stalenessGuard` — records a `fetchStartedAt` timestamp before calling the
  fetcher and passes it to the adapter as `writeIfNewerThan`. If an invalidation
  webhook fires while the fetcher is in-flight, the adapter can discard the write
  and force a fresh fetch on the next request.

When the adapter implements `wrap` itself (e.g., `nextAdapter` delegates to
`unstable_cache`), `CacheInstance.wrap` calls the adapter's implementation
directly instead of performing its own read/write cycle.

## `cache.invalidate.<entity>(...)`

Typed invalidation builders. Each entity gets a method matching its param shape.

```ts
await cache.invalidate.product({ tenant: shop, handle: 'gummy-bears' }); // leaf + fanout
await cache.invalidate.products({ tenant: shop });                        // entity collection
await cache.invalidate.tenant(shop);                                      // all tenant tags
await cache.invalidate.all();                                             // namespace root
```

Calling an entity invalidator without optional params emits tags from the narrowest
available scope (entity collection rather than leaf). Calling `.tenant(shop)` emits
the tenant root plus any `extraTags` for that tenant. Calling `.all()` emits only
the namespace root — use it to purge everything.

## `cache.invalidateRaw(tags)`

Bypass the typed invalidators and fire a raw set of tags through the adapter.
Useful when a plugin (e.g., `@tagtree/shopify`) has already computed the tag array
and you want to pass it straight through.

```ts
const tags = parseShopifyWebhook({ schema: shopCache, tenant: shop, topic, body });
if (tags.length > 0) {
    await cache.invalidateRaw(tags);
} else {
    await cache.invalidate.tenant(shop);
}
```

## Adapter contract

An adapter must implement `CacheAdapter` from `@tagtree/core`:

```ts
interface CacheAdapter {
    read(key: string, ctx: AdapterCtx): Promise<{ value: unknown; tags: string[] } | undefined>;
    write(key: string, value: unknown, tags: string[], opts: WriteOpts, ctx: AdapterCtx): Promise<void>;
    invalidate(tags: string[], ctx: AdapterCtx): Promise<void>;
    // Optional — when present, cache.wrap delegates the entire round-trip here.
    wrap?<R>(key: string, fetcher: () => Promise<R>, tags: string[], opts: WriteOpts, ctx: AdapterCtx): Promise<R>;
    decorateResponse?(response: Response, tags: string[]): Response;
    init?(): Promise<void>;
}
```

`AdapterCtx` carries the schema and a logger so adapters can emit structured logs
without taking the logger as a constructor argument.

The full type lives at `src/adapter.ts`.

## Built-in `memoryAdapter`

A simple in-process LRU cache for development, testing, and edge runtimes where
an external store is not available.

```ts
import { memoryAdapter } from '@tagtree/core';

const adapter = memoryAdapter({ maxEntries: 500 }); // default: 1000
```

Entries are evicted when the tag is invalidated or when the store exceeds
`maxEntries` (oldest entry removed first). TTL expiry is checked on read.

The `memoryAdapter` is not shared across requests in a serverless environment
(each invocation gets a fresh module). For persistence across requests, use a
Redis adapter or similar.

## `compose(...adapters)`

Layer multiple adapters into a single one. Reads try each adapter in order and
return the first hit. Writes and invalidations fan out to all adapters in parallel.

```ts
import { compose, memoryAdapter } from '@tagtree/core';
import { redisAdapter } from './redis-adapter';

const cache = createCacheInstance(
    shopCache,
    compose(memoryAdapter({ maxEntries: 200 }), redisAdapter(redis)),
);
```

Adapter failures are caught and logged via the instance logger; a failing adapter
does not abort the read/write on sibling adapters.

## Available adapters and plugins

| Package | Description |
|---------|-------------|
| [`@tagtree/next`](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-next#readme) | Next.js adapter — delegates `wrap` to `unstable_cache` and `invalidate` to `revalidateTag`. |
| [`@tagtree/shopify`](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-shopify#readme) | Shopify webhook HMAC verification + topic-to-tag mapping. |
| [`@tagtree/payload`](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-payload#readme) | Payload CMS `afterChange` / `afterDelete` hook factory. |

## License

MIT — see [repository](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-core).

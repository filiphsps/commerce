# @tagtree/payload

Payload CMS hook factory for `@tagtree/core` — wires `afterChange` and `afterDelete`
collection hooks to typed cache invalidation.

Every time an editor publishes a document in Payload, `payloadHooks` fires the
appropriate `cache.invalidate.<entity>(...)` call so that cached representations
of that document are evicted before the next request lands. It handles tenant
normalization (string vs. relation object), doc-key resolution, and the draft-gate
that prevents Payload's autosave cadence from flushing production cache on every
keystroke.

> Part of the `@tagtree/*` suite. See
> [`@tagtree/core`](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-core#readme)
> for schema definition, key builders, and the full concept guide.

## Install

Requires Payload 3 or later as a peer dependency.

```sh
pnpm add @tagtree/payload @tagtree/core
npm install @tagtree/payload @tagtree/core
```

## `payloadHooks(cache, opts)`

Returns a `CollectionConfig['hooks']` object containing `afterChange` and
`afterDelete` arrays.

```ts
import { payloadHooks } from '@tagtree/payload';

payloadHooks(cache, {
    entity: 'page',             // must match a key in your schema entities
    gatePublishedDrafts: true,  // default: true
})
// → { afterChange: [fn], afterDelete: [fn] }
```

### `PayloadHooksOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | `string` | required | Entity name as declared in the cache schema. |
| `gatePublishedDrafts` | `boolean` | `true` | When `true`, `afterChange` only fires invalidation when `_status === 'published'`. |

## Example collection config

```ts
// collections/Pages.ts
import type { CollectionConfig } from 'payload';
import { payloadHooks } from '@tagtree/payload';
import { cache } from '../lib/cache';

export const Pages: CollectionConfig = {
    slug: 'pages',
    versions: { drafts: true },
    hooks: payloadHooks(cache, { entity: 'page' }),
    fields: [
        { name: 'slug', type: 'text', required: true },
        { name: 'tenant', type: 'relationship', relationTo: 'shops', required: true },
        // ...
    ],
};
```

## Draft-gate behavior (`gatePublishedDrafts`)

When `gatePublishedDrafts: true` (the default), `afterChange` inspects `doc._status`
before deciding whether to invalidate:

- `_status === 'draft'` or `_status === undefined` with drafts enabled — **skip**.
  Payload autosaves draft-enabled collections every few seconds; flushing production
  cache on each autosave would create a burst of unnecessary invalidations for
  content that anonymous readers cannot see yet.
- `_status === 'published'` — **invalidate**. The document is now live.
- `_status` field is absent entirely (the field does not exist on this collection)
  — **invalidate**. Collections without draft support have no `_status` field, so
  every `afterChange` is implicitly a publish event.

`afterDelete` always invalidates regardless of this setting.

### When to use `gatePublishedDrafts: false`

Set this to `false` for globals or collections that do not use Payload's draft
system — for example, a site-wide header or footer configuration where every save
is immediately live and there is no staging lifecycle to gate on.

```ts
hooks: payloadHooks(cache, { entity: 'header', gatePublishedDrafts: false }),
```

## Tenant normalization

`payloadHooks` reads `doc.tenant` and normalizes it to a string before passing it
to the cache invalidator:

- `string` — used as-is (the tenant key).
- `{ id: string }` — uses `id`. This covers the case where Payload populates the
  relation rather than returning the raw ID.
- Missing or `undefined` — the hook returns early without invalidating.

The resolved string is passed directly as the `tenant` argument to
`cache.invalidate[entity](...)`, so it must match whatever your schema's
`tenant.key(...)` returns.

## Doc key resolution

The hook resolves the document's cache key in this order:

1. `doc.slug` — preferred; stable and human-readable.
2. `doc.shopifyHandle` — for documents synced from Shopify.
3. `String(doc.id)` — fallback.

The resolved key is passed as the `key` param to the entity invalidator. Your
schema's entity declaration should name this param `key`:

```ts
const shopCache = defineCache({
    namespace: 'cms',
    tenant: { type: {} as string, key: (id) => id },
    entities: {
        page: { params: { key: str } },
    },
});
```

## License

MIT — see [repository](https://github.com/filiphsps/commerce/tree/master/packages/tagtree-payload).

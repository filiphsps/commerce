---
title: Editor manifests
sidebar_position: 6
---

# Editor manifests

A `CollectionEditorManifest` declares everything the editor primitives need to
know about a Payload collection that isn't already in the collection config.

## `defineCollectionEditor`

Identity helper that gives the manifest object the right type without
`as const`:

```ts
import { defineCollectionEditor } from '@nordcom/commerce-cms/editor';

export const businessDataEditor = defineCollectionEditor({
    collection: 'businessData',
    routes: {
        label: { singular: 'Business data', plural: 'Business data' },
        basePath: (domain) => `/${domain}/content/business-data/`,
        breadcrumbs: ({ domain }) => [
            { label: 'Content', href: `/${domain}/content/` },
            { label: 'Business data' },
        ],
    },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: tenantMember, read: tenantMember, update: editorOrAdmin, delete: adminOnly },
    revalidate: ({ domain }) => [`/${domain}/content/business-data/`],
});
```

## Fields

### `collection: CollectionSlug` *(required)*

The Payload collection slug. The collection's `fields`, `versions.drafts`,
`localization`, and `access` are read from the live Payload config at render
time — the manifest never duplicates them.

### `routes` *(required)*

| Field | Type | Notes |
|---|---|---|
| `label.singular` | `string` | Used as the page title for create / single-doc edit. |
| `label.plural` | `string` | Used in headers and breadcrumbs. |
| `basePath` | `(domain) => Route` | Returns the list path. `domain` is null on cross-tenant routes. |
| `breadcrumbs` | `({ domain }) => [{ label, href? }]` | Optional. Last item has no `href`. |
| `keyField` | `'id' \| string` | URL segment field for the id portion. Default `'id'`. Override for handle-keyed collections. |

### `tenant` *(required)*

| `kind` | Where clause | Use for |
|---|---|---|
| `'scoped'` | `and: [tenant = X, keyField = id]` | Most content collections (`pages`, `articles`, `header`, `footer`, `businessData`). |
| `'shared'` | `keyField = id` | Cross-tenant admin collections (`tenants`, `users`, `media`). |
| `'singleton-by-domain'` | `or: [domain = id, alternativeDomains contains id]` | Shop, where the route segment IS the domain. |

### `access` *(required)*

Route-level gates. Run **before** Payload's collection-level access predicates
(defense in depth). Return `false` → `notFound()`.

```ts
access: {
    list: tenantMember,
    read: tenantMember,
    create: editorOrAdmin,
    update: editorOrAdmin,
    delete: adminOnly,
}
```

Built-in predicates exported from `@nordcom/commerce-cms/editor`:

- `adminOnly` — only `role: 'admin'` passes.
- `editorOrAdmin` — admin or editor.
- `tenantMember` — admin always; editors only if the requested domain is in
  `user.tenants`.

### `list` *(optional)*

When omitted, the manifest has no list view (global-style collection).

```ts
list: {
    columns: [
        { label: 'Title', accessor: 'title' },
        { label: 'Updated', accessor: 'updatedAt', render: (v) => new Date(String(v)).toLocaleString() },
    ],
    sortBy: '-updatedAt',                     // optional; default '-updatedAt'
    bulkActions: ['delete', 'publish'],       // optional
}
```

### `livePreview` *(optional)*

Builder for the preview iframe URL. The iframe slot stays hidden when this
field is omitted.

```ts
livePreview: ({ tenantId, collection, data, locale }) =>
    `https://${tenantId}.preview.example.com/${collection}?locale=${locale}&t=${(data as { updatedAt: string }).updatedAt}`
```

### `revalidate` *(optional)*

Paths to `revalidatePath` after every successful write. Called with
`{ domain, doc, status }`.

```ts
revalidate: ({ domain, status }) => {
    const paths = [`/${domain}/content/business-data/`];
    if (status === 'published') paths.push(`/${domain}/`);
    return paths;
}
```

## Worked examples

### Tenant-scoped global with drafts (businessData)

```ts
export const businessDataEditor = defineCollectionEditor({
    collection: 'businessData',
    routes: {
        label: { singular: 'Business data', plural: 'Business data' },
        basePath: (d) => `/${d}/content/business-data/`,
        breadcrumbs: ({ domain }) => [
            { label: 'Content', href: `/${domain}/content/` },
            { label: 'Business data' },
        ],
    },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: {
        list: tenantMember, read: tenantMember,
        update: editorOrAdmin, delete: adminOnly,
    },
    revalidate: ({ domain }) => [`/${domain}/content/business-data/`],
});
```

### Singleton-by-domain (shop — Phase 2)

```ts
export const shopEditor = defineCollectionEditor({
    collection: 'shops',
    routes: {
        label: { singular: 'Shop', plural: 'Shops' },
        basePath: (d) => `/${d}/settings/shop/`,
        keyField: 'domain',
    },
    tenant: { kind: 'singleton-by-domain' },
    access: { list: () => false, read: tenantMember, update: adminOnly, delete: adminOnly },
    revalidate: ({ domain }) => [`/${domain}/`, `/${domain}/settings/shop/`],
});
```

## Registering a manifest

Add the manifest to the `allManifests` array in
`packages/cms/src/editor/manifests/index.ts`. Then run `pnpm cms:gen` to emit
the corresponding action wrappers. CI will fail with a `DRIFT:` error if the
checked-in `_generated/` files don't match what the generator produces.

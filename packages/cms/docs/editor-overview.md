---
title: Editor system
sidebar_position: 5
---

# Editor system

The editor system (`@nordcom/commerce-cms/editor`) is the unified way to build
admin pages for Payload collections. Each editor page is driven by a
**manifest** — a thin metadata wrapper around a Payload `CollectionConfig`
that adds route shape, route-level access predicates, list columns, live
preview URL, and revalidation paths.

## Why

Before this system the admin app shipped two parallel patterns:

- Per-collection routes with hand-written `parseFormData`, `*-form.tsx`,
  `*-fields.tsx`, and `cms-actions/<name>.ts` action files.
- The Mongoose-backed bridge plugin with its own `<BridgeEditPage>` +
  `createBridgeServerActions`.

Adding a feature (tightening field allowlists, fixing the autosave loop,
improving error handling) meant touching both. The unified editor system
collapses them into one primitive set; phases 2 and 3 of the
[CMS Editor Unification design](/docs/superpowers/specs/2026-05-16-cms-unification-design)
migrate the remaining collections and the bridge entities.

## The mental model

```
Payload CollectionConfig       ←   single source of truth for fields, drafts,
                                   versions, locales, hooks, collection-level
                                   access predicates.

CollectionEditorManifest       ←   route shape, route-level access, list
                                   columns, live-preview URL, revalidation.
                                   References the collection by slug.

EditorRuntime                  ←   admin-app dependency bundle: auth helper,
                                   form-state builder, shell-props helper,
                                   shell components. Built once per app.

<EditorEditPage>               ←   server component; consumes manifest +
<EditorListPage>                   runtime + route params; renders the
<EditorNewPage>                    appropriate Payload form / list inside
<EditorVersionsPage>               the admin's chrome.

pnpm cms:gen                   ←   codegen step that emits `'use server'`
                                   action wrappers per manifest into
                                   `apps/admin/src/lib/cms-actions/_generated/`.
```

## Route file shape

A per-collection `page.tsx` is ~25 lines:

```tsx
import 'server-only';
import { businessDataEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import * as actions from '@/lib/cms-actions/_generated/businessData';
import { editorRuntime } from '@/lib/editor-runtime';

export default async function Page({ params, searchParams }: {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
}) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={businessDataEditor}
            runtime={editorRuntime}
            params={{ domain, id: 'singleton' }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.businessDataSaveDraft,
                publish: actions.businessDataPublish,
                create: actions.businessDataCreate,
                delete: actions.businessDataDelete,
                bulkDelete: actions.businessDataBulkDelete,
                bulkPublish: actions.businessDataBulkPublish,
                restoreVersion: actions.businessDataRestoreVersion,
            }}
        />
    );
}
```

## When to use it

- A new Payload collection needs an admin edit / list / new / versions page.
- An existing collection's bespoke route is being refactored away.
- A Mongoose-backed entity is moving to Payload as part of the unification.

## When NOT to use it

- A route doesn't follow the "edit one Payload collection" shape — e.g.
  multi-collection dashboards, custom workflows. Build those by hand and let
  them coexist with editor routes.
- One-off scripts or admin tools that don't need Payload's form chrome at all.

## Continue reading

- [Manifest reference](./editor-manifests.md) — every field on
  `CollectionEditorManifest` explained, with worked examples.
- [Collections reference](./collections.md) — the Payload collection configs
  the manifests reference.

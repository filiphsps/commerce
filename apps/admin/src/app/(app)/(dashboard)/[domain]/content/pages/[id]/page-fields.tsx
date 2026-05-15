'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the pages collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 *
 * The pages collection has:
 *   - `title` — localized text (required)
 *   - `slug` — text (required, indexed)
 *   - `blocks` — Payload "blocks" type with allBlocks variants. `<RenderFields>`
 *     delegates to `<BlocksField>` from `@payloadcms/ui` transparently — no
 *     special wiring needed here.
 *   - `seo` — localized group with nested text/upload/checkbox fields.
 *     `<RenderFields>` renders it as a collapsible group section automatically.
 *
 * The `tenant` field is managed by `@payloadcms/plugin-multi-tenant` and is
 * excluded from the rendered fields by the plugin's `admin.hidden` config.
 */
export function PageFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'pages' });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields fields={fields} parentIndexPath="" parentPath="" parentSchemaPath="pages" permissions={true} />
    );
}

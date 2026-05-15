'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the productMetadata collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 *
 * The productMetadata collection has:
 *   - `shopifyHandle` — text (required, indexed). Payload renders a read-only
 *     display for the handle; it is set once on create from the URL and never
 *     changed via the form.
 *   - `descriptionOverride` — localized richText using Lexical editor.
 *     `<RenderFields>` delegates to `<RichTextField>` from
 *     `@payloadcms/richtext-lexical` transparently — no special wiring needed.
 *   - `blocks` — Payload "blocks" type with allBlocks variants. `<RenderFields>`
 *     delegates to `<BlocksField>` from `@payloadcms/ui` transparently.
 *   - `seo` — localized group with nested text/upload/checkbox fields.
 *     `<RenderFields>` renders it as a collapsible group section automatically.
 *
 * The `tenant` field is managed by `@payloadcms/plugin-multi-tenant` and is
 * excluded from the rendered fields by the plugin's `admin.hidden` config.
 */
export function ProductMetadataFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'productMetadata' });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields
            fields={fields}
            parentIndexPath=""
            parentPath=""
            parentSchemaPath="productMetadata"
            permissions={true}
        />
    );
}

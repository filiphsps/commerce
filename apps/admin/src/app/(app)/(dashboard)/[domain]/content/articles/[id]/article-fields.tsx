'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the articles collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 *
 * The articles collection has:
 *   - `title` — localized text (required)
 *   - `slug` — text (required, indexed)
 *   - `author` — text (required)
 *   - `publishedAt` — date field. `<RenderFields>` renders a date picker UI.
 *   - `cover` — upload (relation to media collection). `<RenderFields>`
 *     renders an upload field transparently.
 *   - `excerpt` — localized textarea.
 *   - `body` — localized richText using Lexical editor. `<RenderFields>`
 *     delegates to `<RichTextField>` from `@payloadcms/richtext-lexical`
 *     transparently — no special wiring needed here.
 *   - `tags` — hasMany text field. `<RenderFields>` renders as a tag input.
 *   - `seo` — localized group with nested text/upload/checkbox fields.
 *     `<RenderFields>` renders it as a collapsible group section automatically.
 *
 * The `tenant` field is managed by `@payloadcms/plugin-multi-tenant` and is
 * excluded from the rendered fields by the plugin's `admin.hidden` config.
 */
export function ArticleFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'articles' });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields
            fields={fields}
            parentIndexPath=""
            parentPath=""
            parentSchemaPath="articles"
            permissions={true}
        />
    );
}

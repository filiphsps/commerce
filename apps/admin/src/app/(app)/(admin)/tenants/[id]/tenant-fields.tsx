'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the tenants collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 *
 * The tenants collection has:
 *   - `name` — text (required)
 *   - `slug` — text (required, unique, indexed)
 *   - `defaultLocale` — text (required, default 'en-US')
 *   - `locales` — text hasMany (required, default ['en-US'])
 *   - `shopId` — text (optional, indexed)
 *
 * No `_status`, no `seo` group, no blocks, no richText. `<RenderFields>`
 * handles all five fields trivially as standard text inputs.
 */
export function TenantFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'tenants' });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields
            fields={fields}
            parentIndexPath=""
            parentPath=""
            parentSchemaPath="tenants"
            permissions={true}
        />
    );
}

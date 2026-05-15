'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the users collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 *
 * The users collection (after multi-tenant plugin) has these schema fields:
 *   - `role` — select (required, options: admin | editor)
 *   - `email` — text (required, unique, added by auth config)
 *   - `tenants` — array added by multi-tenant plugin (handled separately in
 *     `UserForm` toolbar via a native multi-select for simplicity)
 *
 * No `_status`, no seo group, no blocks, no richText, no versions/drafts.
 * `<RenderFields>` handles the standard fields trivially.
 */
export function UserFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'users' });
    // Filter out the `tenants` field that the multi-tenant plugin injects.
    // Tenant assignment is owned by the toolbar's native <select multiple>
    // in `UserForm`. Rendering Payload's native array widget here would
    // double up controls on the same page and confuse users about which
    // one actually persists the value on save.
    const fields = (collectionConfig?.fields ?? []).filter((f) => {
        const name = (f as { name?: unknown }).name;
        return typeof name !== 'string' || name !== 'tenants';
    });

    return (
        <RenderFields fields={fields} parentIndexPath="" parentPath="" parentSchemaPath="users" permissions={true} />
    );
}

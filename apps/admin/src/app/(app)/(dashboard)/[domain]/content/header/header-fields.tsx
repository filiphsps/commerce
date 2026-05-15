'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the header collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 *
 * The `navItemField({ depth: 3 })` produces a recursive `items` array field.
 * `<RenderFields>` handles this transparently — the recursion is encoded in
 * the collection config that Payload already registered, so no special
 * handling is needed here.
 */
export function HeaderFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'header' });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields
            fields={fields}
            parentIndexPath=""
            parentPath=""
            parentSchemaPath="header"
            permissions={true}
        />
    );
}

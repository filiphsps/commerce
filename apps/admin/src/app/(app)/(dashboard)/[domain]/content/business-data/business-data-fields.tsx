'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the businessData collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 */
export function BusinessDataFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'businessData' });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields
            fields={fields}
            parentIndexPath=""
            parentPath=""
            parentSchemaPath="businessData"
            permissions={true}
        />
    );
}

'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

/**
 * Renders the footer collection fields via Payload's `<RenderFields>`.
 *
 * Must be a client component (RenderFields only works in a client boundary).
 * Must be rendered inside `<PayloadFieldShell>` (i.e. inside Payload's
 * `<ConfigProvider>`) — `useConfig()` reads from that context.
 * Must be rendered inside Payload's `<Form>` — RenderFields reads form state
 * from the form context.
 *
 * The `sections` field is a localized array of link groups; `social` and
 * `legal` are flat arrays. `<RenderFields>` handles these transparently —
 * the recursion is encoded in the collection config that Payload already
 * registered, so no special handling is needed here.
 */
export function FooterFields() {
    const { getEntityConfig } = useConfig();
    const collectionConfig = getEntityConfig({ collectionSlug: 'footer' });
    const fields = collectionConfig?.fields ?? [];

    return (
        <RenderFields fields={fields} parentIndexPath="" parentPath="" parentSchemaPath="footer" permissions={true} />
    );
}

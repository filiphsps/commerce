'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

export type EditorFieldsProps = {
    /** Payload collection slug. Must match the manifest's collection. */
    collection: string;
};

/**
 * Generic field renderer for any Payload collection. Reads the collection
 * config via `useConfig()` (provided by the shell's `<ConfigProvider>`) and
 * delegates to Payload's `<RenderFields>`.
 *
 * Must be rendered inside `<PayloadFieldShell>` (for `useConfig`) and inside
 * Payload's `<Form>` (for `RenderFields` to read form state).
 */
export function EditorFields({ collection }: EditorFieldsProps) {
    const { getEntityConfig } = useConfig();
    const config = getEntityConfig({ collectionSlug: collection });
    const fields = config?.fields ?? [];

    return (
        <RenderFields
            fields={fields}
            parentIndexPath=""
            parentPath=""
            parentSchemaPath={collection}
            permissions={true}
        />
    );
}

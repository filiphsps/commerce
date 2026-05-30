'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';
import { isHiddenEditorField } from '../hidden-fields';

/**
 * Props for {@link EditorFields}.
 *
 * @example
 * <EditorFields collection="pages" />
 */
export type EditorFieldsProps = {
    /** Payload collection slug. Must match the manifest's collection. */
    collection: string;
    /**
     * Named top-level fields to drop from the RENDERED tree only. Unlike
     * `isHiddenEditorField`, this does NOT strip the field from `FormState`,
     * so its dotted paths stay live for `useField`/save even when another
     * surface (e.g. the theme editor) owns the UI for them.
     */
    omitPaths?: string[];
};

/**
 * Generic field renderer for any Payload collection. Reads the collection
 * config via `useConfig()` (provided by the shell's `<ConfigProvider>`) and
 * delegates to Payload's `<RenderFields>`. Drops every field
 * `isHiddenEditorField` flags so the rendered tree matches the form state
 * `buildCmsFormState` strips on the server.
 *
 * Must be rendered inside `<PayloadFieldShell>` (for `useConfig`) and inside
 * Payload's `<Form>` (for `RenderFields` to read form state).
 *
 * @param props.collection - Payload collection slug to render fields for.
 * @param props.omitPaths - Named top-level fields to skip in the rendered tree
 *   without touching their `FormState` entries.
 */
export function EditorFields({ collection, omitPaths }: EditorFieldsProps) {
    const { getEntityConfig } = useConfig();
    const config = getEntityConfig({ collectionSlug: collection });
    const omit = new Set(omitPaths ?? []);
    const fields = (config?.fields ?? []).filter(
        (f) => !isHiddenEditorField(f) && !('name' in f && typeof f.name === 'string' && omit.has(f.name)),
    );

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

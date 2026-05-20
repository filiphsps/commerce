'use client';

import { RenderFields, useConfig } from '@payloadcms/ui';

export type EditorFieldsProps = {
    /** Payload collection slug. Must match the manifest's collection. */
    collection: string;
};

/**
 * Detects the relationship field the @payloadcms/plugin-multi-tenant package
 * injects. We intentionally do not generate Payload's importMap (see
 * apps/admin/src/lib/build-cms-form-state.ts), which means the custom Field
 * component referenced by `admin.components.Field.path` cannot resolve at
 * render time — Payload falls back to the standard `relationship` field whose
 * validate/label functions were stripped during RSC serialization, and the
 * first button to invoke one throws `x is not a function`.
 *
 * Tenant identity is derived from the URL `[domain]` segment, so the picker
 * is wrong UX even if it rendered.
 */
function isMultiTenantPluginTenantField(f: unknown): boolean {
    if (!f || typeof f !== 'object') return false;
    const field = f as {
        name?: string;
        type?: string;
        admin?: { position?: string; components?: { Field?: { path?: string } | string } };
    };
    if (field.name !== 'tenant') return false;
    if (field.type !== 'relationship') return false;
    if (field.admin?.position !== 'sidebar') return false;
    const fieldComponent = field.admin?.components?.Field;
    const path = typeof fieldComponent === 'string' ? fieldComponent : fieldComponent?.path;
    return path === '@payloadcms/plugin-multi-tenant/client#TenantField';
}

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
    const fields = (config?.fields ?? []).filter((f) => !isMultiTenantPluginTenantField(f));

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

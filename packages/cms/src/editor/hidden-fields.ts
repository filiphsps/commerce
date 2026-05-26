/**
 * Fields the admin editor intentionally does not render — neither as a UI
 * input nor as form-state. Two callers consume this predicate:
 *
 * - `<EditorFields>` (`./ui/editor-fields.tsx`) drops matching fields before
 *   handing the list to Payload's `<RenderFields>`, so users never see them.
 * - `buildCmsFormState` (in `apps/admin/src/lib/build-cms-form-state.ts`)
 *   strips matching paths from the `FormState` returned by Payload's
 *   `buildFormState`. With `mockRSCs: true` Payload emits the literal string
 *   `'Mock'` in `customComponents.Field` for every field that declares a
 *   server-side renderer — even ones marked with the `Field: false` sentinel.
 *   Removing those entries keeps the editor's unsupported-mock warning quiet
 *   for fields we deliberately hide.
 *
 * Both call sites consult this single source of truth so a field added to
 * the rules below disappears from both the rendered tree and the warning
 * log in one change.
 *
 * The predicate has to work on both the SERVER-side flattened config (where
 * `admin.components` is preserved) and the CLIENT-side sanitized config
 * (where Payload's `serverOnlyFieldAdminProperties` strips `components`
 * entirely — see `payload/dist/fields/config/client.js`). Each rule
 * therefore carries two detection branches: one matches the server-only
 * component descriptor, the other matches a property signature that
 * survives client sanitization.
 */

type ComponentDescriptor = string | false | { path?: string };

type HiddenFieldShape = {
    name?: string;
    type?: string;
    relationTo?: string;
    admin?: {
        position?: string;
        allowCreate?: boolean;
        allowEdit?: boolean;
        components?: { Field?: ComponentDescriptor };
    };
};

/**
 * Returns the path string for an `admin.components.Field` value, regardless
 * of whether it was declared as the shorthand `'path#export'` string or the
 * object form `{ path: 'path#export', ... }`. Returns `undefined` for any
 * other shape — including Payload's `false` sentinel — so callers can match
 * a specific plugin component without first narrowing the descriptor type.
 *
 * @param descriptor - The raw `admin.components.Field` value from the field
 *   config, or `undefined` when the field declares no custom Field component.
 * @returns The component path string, or `undefined` when none applies.
 */
function pathOf(descriptor: ComponentDescriptor | undefined): string | undefined {
    if (typeof descriptor === 'string') return descriptor;
    if (descriptor && typeof descriptor === 'object') return descriptor.path;
    return undefined;
}

/**
 * Predicate that returns `true` when a Payload field config is one we
 * deliberately hide from the admin editor. The match rules live inline so
 * each suppression carries the reason it exists.
 *
 * Each rule has two branches because Payload's client sanitization strips
 * `admin.components` entirely. The server branch matches the component
 * descriptor when the caller is reading the unsanitized server config; the
 * client branch matches a property signature that survives sanitization.
 *
 * @param field - The field config to test. Accepts `unknown` so callers can
 *   stream raw config entries through without narrowing.
 * @returns `true` when the field should be hidden from both the rendered
 *   tree and the editor's form state; `false` otherwise.
 */
export function isHiddenEditorField(field: unknown): boolean {
    if (!field || typeof field !== 'object') return false;
    const f = field as HiddenFieldShape;
    const fieldComponent = f.admin?.components?.Field;

    // ── Server-side branch: admin.components is preserved. ──
    // Payload's "no UI" sentinel — used by internal fields like `_status`
    // (added by versions.drafts).
    if (fieldComponent === false) return true;
    // The @payloadcms/plugin-multi-tenant tenant picker by component path.
    // The sidebar requirement keeps a relocated picker visible — same
    // discriminator the client branch below uses.
    if (
        pathOf(fieldComponent) === '@payloadcms/plugin-multi-tenant/client#TenantField' &&
        f.admin?.position === 'sidebar'
    ) {
        return true;
    }

    // ── Client-side branch: admin.components has been stripped. ──
    // `_status`: Payload's versions/drafts field. The leading-underscore
    // name is a reserved Payload convention and the `select` type is
    // fixed in `payload/dist/versions/baseFields.js`.
    if (f.name === '_status' && f.type === 'select') return true;
    // Multi-tenant tenant picker: matched by the plugin's locked-down
    // signature in `tenantField()`. Position+allowCreate+allowEdit are
    // plain values that survive client sanitization; together with the
    // relationTo target they're specific enough to skip a user-defined
    // relationship that happens to be named `tenant`.
    if (
        f.name === 'tenant' &&
        f.type === 'relationship' &&
        f.relationTo === 'tenants' &&
        f.admin?.position === 'sidebar' &&
        f.admin?.allowCreate === false &&
        f.admin?.allowEdit === false
    ) {
        return true;
    }

    return false;
}

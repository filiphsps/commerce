import { describe, expect, it } from 'vitest';
import { isHiddenEditorField } from './hidden-fields';

describe('isHiddenEditorField', () => {
    describe('input handling', () => {
        it('returns false for non-object inputs', () => {
            expect(isHiddenEditorField(undefined)).toBe(false);
            expect(isHiddenEditorField(null)).toBe(false);
            expect(isHiddenEditorField('field')).toBe(false);
            expect(isHiddenEditorField(42)).toBe(false);
            expect(isHiddenEditorField(true)).toBe(false);
        });

        it('returns false for an empty object', () => {
            expect(isHiddenEditorField({})).toBe(false);
        });

        it('returns false for a field without name/type/admin', () => {
            expect(isHiddenEditorField({ relationTo: 'tenants' })).toBe(false);
        });
    });

    describe('server-side detection (admin.components preserved)', () => {
        it('hides a field with the Payload `Field: false` sentinel', () => {
            // Mirrors Payload's `_status` field added by `versions.drafts`,
            // exactly as it appears in the server-side flattened config.
            expect(
                isHiddenEditorField({
                    name: '_status',
                    type: 'select',
                    admin: { components: { Field: false } },
                }),
            ).toBe(true);
        });

        it('hides any field with `Field: false` regardless of name (sentinel is universal)', () => {
            expect(
                isHiddenEditorField({
                    name: 'whatever',
                    type: 'text',
                    admin: { components: { Field: false } },
                }),
            ).toBe(true);
        });

        it('hides the multi-tenant tenant picker by component descriptor object', () => {
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'relationship',
                    admin: {
                        position: 'sidebar',
                        components: { Field: { path: '@payloadcms/plugin-multi-tenant/client#TenantField' } },
                    },
                }),
            ).toBe(true);
        });

        it('hides the multi-tenant tenant picker declared with the string Field shorthand', () => {
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'relationship',
                    admin: {
                        position: 'sidebar',
                        components: { Field: '@payloadcms/plugin-multi-tenant/client#TenantField' },
                    },
                }),
            ).toBe(true);
        });

        it('does not hide the multi-tenant component path when relocated out of the sidebar', () => {
            // Sidebar position is part of the plugin's signature; an editor
            // that moves the picker inline is no longer the plugin-injected one.
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'relationship',
                    admin: {
                        position: 'inline',
                        components: { Field: { path: '@payloadcms/plugin-multi-tenant/client#TenantField' } },
                    },
                }),
            ).toBe(false);
        });
    });

    describe('client-side detection (admin.components stripped by Payload)', () => {
        it('hides _status by name+type alone', () => {
            // Payload strips admin.components during client sanitization
            // (`serverOnlyFieldAdminProperties` in payload/dist/fields/config/client.js).
            // The reserved `_status` name + `select` type is enough to identify it.
            expect(
                isHiddenEditorField({
                    name: '_status',
                    type: 'select',
                    admin: { disableBulkEdit: true },
                }),
            ).toBe(true);
        });

        it('does not hide a field named _status that is not a select', () => {
            // The underscore-prefix is reserved in Payload but the rule
            // targets the specific versions/drafts select field — a different
            // `_status` type is presumed deliberate.
            expect(
                isHiddenEditorField({
                    name: '_status',
                    type: 'text',
                }),
            ).toBe(false);
        });

        it('does not hide a select named status (no underscore prefix)', () => {
            expect(
                isHiddenEditorField({
                    name: 'status',
                    type: 'select',
                }),
            ).toBe(false);
        });

        it('hides the multi-tenant tenant picker by its full plugin signature', () => {
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'relationship',
                    relationTo: 'tenants',
                    admin: {
                        position: 'sidebar',
                        allowCreate: false,
                        allowEdit: false,
                        disableGroupBy: true,
                        disableListColumn: true,
                        disableListFilter: true,
                    },
                }),
            ).toBe(true);
        });

        it('does not hide a user-defined sidebar relationship to tenants lacking the locked-down flags', () => {
            // The multi-tenant plugin always sets allowCreate=false AND
            // allowEdit=false; a hand-rolled relationship to `tenants`
            // typically wouldn't.
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'relationship',
                    relationTo: 'tenants',
                    admin: { position: 'sidebar' },
                }),
            ).toBe(false);
        });

        it('does not hide a sidebar relationship with only allowCreate locked (allowEdit missing)', () => {
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'relationship',
                    relationTo: 'tenants',
                    admin: { position: 'sidebar', allowCreate: false },
                }),
            ).toBe(false);
        });

        it('does not hide a relationship with the full signature but a custom name (overridden tenantFieldName)', () => {
            // Documents the limitation: if the multi-tenant plugin is
            // configured with `tenantField.name` overridden, callers must
            // hide that field through some other mechanism.
            expect(
                isHiddenEditorField({
                    name: 'assignedTenant',
                    type: 'relationship',
                    relationTo: 'tenants',
                    admin: {
                        position: 'sidebar',
                        allowCreate: false,
                        allowEdit: false,
                    },
                }),
            ).toBe(false);
        });

        it('does not hide a non-relationship field named tenant', () => {
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'text',
                }),
            ).toBe(false);
        });

        it('does not hide a relationship named tenant pointing to a non-tenants collection', () => {
            expect(
                isHiddenEditorField({
                    name: 'tenant',
                    type: 'relationship',
                    relationTo: 'organizations',
                    admin: {
                        position: 'sidebar',
                        allowCreate: false,
                        allowEdit: false,
                    },
                }),
            ).toBe(false);
        });
    });

    describe('non-hidden fields', () => {
        it('does not hide a regular field with a non-Payload custom Field component', () => {
            expect(
                isHiddenEditorField({
                    name: 'title',
                    type: 'text',
                    admin: { components: { Field: { path: '@/components/cms/title-field' } } },
                }),
            ).toBe(false);
        });

        it('does not hide a field with no admin block at all', () => {
            expect(isHiddenEditorField({ name: 'title', type: 'text' })).toBe(false);
        });

        it('does not hide an array field even if its name happens to be _status', () => {
            expect(
                isHiddenEditorField({
                    name: '_status',
                    type: 'array',
                    fields: [],
                }),
            ).toBe(false);
        });
    });
});

// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type StubField = { name: string; type: string; [key: string]: unknown };

/**
 * Test stub that surfaces both the field count and the surviving field
 * names so each assertion can check the EXACT set of fields that made it
 * through `<EditorFields>`'s filter, not just the cardinality.
 */
vi.mock('@payloadcms/ui', () => ({
    RenderFields: ({ fields, parentSchemaPath }: { fields: StubField[]; parentSchemaPath: string }) => (
        <div
            data-testid="render-fields"
            data-schema-path={parentSchemaPath}
            data-field-names={fields.map((f) => f.name).join(',')}
        >
            {fields.length} fields
        </div>
    ),
    useConfig: () => ({
        getEntityConfig: ({ collectionSlug }: { collectionSlug: string }) => {
            if (collectionSlug === 'businessData') return { fields: [{ name: 'legalName', type: 'text' }] };
            if (collectionSlug === 'footer') {
                // Mirrors the client config — Payload strips
                // `admin.components` during client sanitization
                // (`serverOnlyFieldAdminProperties` in
                // `payload/dist/fields/config/client.js`), so the
                // multi-tenant tenant field has to be matched by its
                // locked-down `tenantField()` signature instead.
                return {
                    fields: [
                        { name: 'sections', type: 'array', fields: [] },
                        {
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
                        },
                    ],
                };
            }
            if (collectionSlug === 'with-text-tenant') {
                return { fields: [{ name: 'tenant', type: 'text' }] };
            }
            if (collectionSlug === 'with-custom-relation-tenant') {
                return {
                    fields: [
                        {
                            name: 'tenant',
                            type: 'relationship',
                            relationTo: 'tenants',
                            admin: { position: 'sidebar' },
                        },
                    ],
                };
            }
            if (collectionSlug === 'with-status') {
                // _status as the client receives it — `admin.components` has
                // already been stripped by Payload's client sanitization.
                return {
                    fields: [
                        { name: 'title', type: 'text' },
                        { name: '_status', type: 'select', admin: { disableBulkEdit: true } },
                    ],
                };
            }
            if (collectionSlug === 'header') {
                // Realistic header collection: a logo image, a navigation
                // array, the plugin-injected tenant picker, and the
                // versions/drafts `_status` field. Only the first two
                // should survive `<EditorFields>`'s filter.
                return {
                    fields: [
                        { name: 'logo', type: 'upload' },
                        { name: 'nav', type: 'array', fields: [] },
                        {
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
                        },
                        { name: '_status', type: 'select', admin: { disableBulkEdit: true } },
                    ],
                };
            }
            return null;
        },
    }),
}));

import { EditorFields } from './editor-fields';

/**
 * Returns the `data-field-names` value the stub `<RenderFields>` records,
 * split into a sorted array so assertions are order-independent.
 */
function renderedFieldNames(el: HTMLElement): string[] {
    const value = el.getAttribute('data-field-names') ?? '';
    return value ? value.split(',').sort() : [];
}

describe('<EditorFields>', () => {
    it('renders the collection fields using parentSchemaPath = collection slug', () => {
        const { getByTestId } = render(<EditorFields collection="businessData" />);
        const el = getByTestId('render-fields');
        expect(el.getAttribute('data-schema-path')).toBe('businessData');
        expect(renderedFieldNames(el)).toEqual(['legalName']);
    });

    it('renders an empty fields list when getEntityConfig returns null', () => {
        const { getByTestId } = render(<EditorFields collection="unknownSlug" />);
        const el = getByTestId('render-fields');
        expect(el.textContent).toContain('0 fields');
        expect(renderedFieldNames(el)).toEqual([]);
    });

    it('drops the multi-tenant plugin tenant field, keeping sibling fields', () => {
        const { getByTestId } = render(<EditorFields collection="footer" />);
        expect(renderedFieldNames(getByTestId('render-fields'))).toEqual(['sections']);
    });

    it('keeps a text field named tenant (only relationship-shape tenant fields are hidden)', () => {
        const { getByTestId } = render(<EditorFields collection="with-text-tenant" />);
        expect(renderedFieldNames(getByTestId('render-fields'))).toEqual(['tenant']);
    });

    it('keeps a relationship named tenant when it lacks the plugin signature', () => {
        const { getByTestId } = render(<EditorFields collection="with-custom-relation-tenant" />);
        expect(renderedFieldNames(getByTestId('render-fields'))).toEqual(['tenant']);
    });

    it('drops the versions/drafts `_status` field, keeping sibling fields', () => {
        const { getByTestId } = render(<EditorFields collection="with-status" />);
        expect(renderedFieldNames(getByTestId('render-fields'))).toEqual(['title']);
    });

    it('drops _status AND the multi-tenant tenant in one pass (realistic header collection)', () => {
        const { getByTestId } = render(<EditorFields collection="header" />);
        expect(renderedFieldNames(getByTestId('render-fields'))).toEqual(['logo', 'nav']);
    });
});

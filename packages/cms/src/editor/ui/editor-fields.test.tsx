// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@payloadcms/ui', () => ({
    RenderFields: ({ fields, parentSchemaPath }: { fields: unknown[]; parentSchemaPath: string }) => (
        <div data-testid="render-fields" data-schema-path={parentSchemaPath}>
            {fields.length} fields
        </div>
    ),
    useConfig: () => ({
        getEntityConfig: ({ collectionSlug }: { collectionSlug: string }) => {
            if (collectionSlug === 'businessData') return { fields: [{ name: 'legalName', type: 'text' }] };
            if (collectionSlug === 'footer') {
                return {
                    fields: [
                        { name: 'sections', type: 'array', fields: [] },
                        {
                            name: 'tenant',
                            type: 'relationship',
                            relationTo: 'tenants',
                            admin: {
                                position: 'sidebar',
                                components: {
                                    Field: { path: '@payloadcms/plugin-multi-tenant/client#TenantField' },
                                },
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
            return null;
        },
    }),
}));

import { EditorFields } from './editor-fields';

describe('<EditorFields>', () => {
    it('renders the collection fields using parentSchemaPath = collection slug', () => {
        const { getByTestId } = render(<EditorFields collection="businessData" />);
        const el = getByTestId('render-fields');
        expect(el.getAttribute('data-schema-path')).toBe('businessData');
        expect(el.textContent).toContain('1 fields');
    });

    it('renders an empty fields list when getEntityConfig returns null', () => {
        const { getByTestId } = render(<EditorFields collection="unknownSlug" />);
        expect(getByTestId('render-fields').textContent).toContain('0 fields');
    });

    it('filters out the multi-tenant plugin tenant field', () => {
        const { getByTestId } = render(<EditorFields collection="footer" />);
        // 2 input fields → 1 after filtering the plugin tenant field
        expect(getByTestId('render-fields').textContent).toContain('1 fields');
    });

    it('does NOT filter a text field named tenant', () => {
        const { getByTestId } = render(<EditorFields collection="with-text-tenant" />);
        expect(getByTestId('render-fields').textContent).toContain('1 fields');
    });

    it('does NOT filter a relationship named tenant without the plugin component path', () => {
        const { getByTestId } = render(<EditorFields collection="with-custom-relation-tenant" />);
        expect(getByTestId('render-fields').textContent).toContain('1 fields');
    });
});

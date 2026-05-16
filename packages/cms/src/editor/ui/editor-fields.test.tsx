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
        getEntityConfig: ({ collectionSlug }: { collectionSlug: string }) =>
            collectionSlug === 'businessData' ? { fields: [{ name: 'legalName', type: 'text' }] } : null,
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
});

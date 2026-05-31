// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FieldDescriptor } from '../../descriptors/types';
import { createFieldRegistry, RenderFields } from './registry';

describe('field-renderer dispatch registry', () => {
    it('dispatches each descriptor to the renderer registered for its kind', () => {
        const registry = createFieldRegistry();
        registry.register('text', ({ field }) => (
            <div data-testid="text-field" data-name={'name' in field ? field.name : ''}>
                text
            </div>
        ));

        const fields: FieldDescriptor[] = [{ type: 'text', name: 'seo.title' }];
        const { getByTestId } = render(<RenderFields registry={registry} fields={fields} parentPath="" />);
        expect(getByTestId('text-field').getAttribute('data-name')).toBe('seo.title');
    });

    it('is extensible — a later registration adds a new kind without touching the core', () => {
        const registry = createFieldRegistry();
        registry.register('checkbox', () => <div data-testid="checkbox-field">checkbox</div>);
        const fields: FieldDescriptor[] = [{ type: 'checkbox', name: 'enabled' }];
        const { getByTestId } = render(<RenderFields registry={registry} fields={fields} parentPath="" />);
        expect(getByTestId('checkbox-field')).toBeTruthy();
    });

    it('renders a fallback for an unregistered kind instead of crashing', () => {
        const registry = createFieldRegistry();
        const fields: FieldDescriptor[] = [{ type: 'json', name: 'meta' }];
        const { getByTestId } = render(<RenderFields registry={registry} fields={fields} parentPath="" />);
        expect(getByTestId('unsupported-field-meta')).toBeTruthy();
    });

    it('threads the parent path into each rendered field path', () => {
        const registry = createFieldRegistry();
        registry.register('text', ({ path }) => <div data-testid="text-field" data-path={path} />);
        const fields: FieldDescriptor[] = [{ type: 'text', name: 'title' }];
        const { getByTestId } = render(<RenderFields registry={registry} fields={fields} parentPath="seo" />);
        expect(getByTestId('text-field').getAttribute('data-path')).toBe('seo.title');
    });
});

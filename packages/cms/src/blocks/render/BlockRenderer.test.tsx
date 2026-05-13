// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockRenderer } from './BlockRenderer';
import type { BlockNode, BlockRenderContext } from './types';

const ctx: BlockRenderContext = {
    shop: { id: 'shop_1', domain: 'example.com' },
    locale: { code: 'en-US' },
    loaders: {
        loadCollection: async () => null,
        loadVendors: async () => [],
        loadOverview: async () => [],
    },
};

describe('BlockRenderer', () => {
    it('renders an alert block', () => {
        const blocks: BlockNode[] = [
            { blockType: 'alert', severity: 'info', title: 'Hello', body: 'Welcome', dismissible: false },
        ];
        render(<BlockRenderer blocks={blocks} context={ctx} />);
        expect(screen.getByText('Hello')).toBeTruthy();
        expect(screen.getByText('Welcome')).toBeTruthy();
    });

    it('renders raw HTML for html block', () => {
        const blocks: BlockNode[] = [{ blockType: 'html', html: '<span data-testid="raw">raw</span>' }];
        const { container } = render(<BlockRenderer blocks={blocks} context={ctx} />);
        expect(container.querySelector('[data-testid="raw"]')).toBeTruthy();
    });

    it('skips unknown block types without throwing', () => {
        const blocks: BlockNode[] = [{ blockType: 'unknown-block' } as unknown as BlockNode];
        const { container } = render(<BlockRenderer blocks={blocks} context={ctx} />);
        expect(container.textContent ?? '').toBe('');
    });
});

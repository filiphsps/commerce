// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockRenderer } from './BlockRenderer';
import type { BlockNode, BlockRenderContext } from './types';

const ctx: BlockRenderContext = {
    shop: { id: 'shop_1', domain: 'example.com' },
    locale: { code: 'en-US' },
    loaders: { loadCollection: async () => null, loadVendors: async () => [], loadOverview: async () => [] },
};

describe('ColumnsBlock (via BlockRenderer)', () => {
    it('renders nested blocks inside each column', () => {
        const blocks: BlockNode[] = [
            {
                blockType: 'columns',
                columns: [
                    { width: '1/2', content: [{ blockType: 'alert', severity: 'info', title: 'Left', dismissible: false }] },
                    { width: '1/2', content: [{ blockType: 'alert', severity: 'info', title: 'Right', dismissible: false }] },
                ],
            },
        ];
        render(<BlockRenderer blocks={blocks} context={ctx} />);
        expect(screen.getByText('Left')).toBeTruthy();
        expect(screen.getByText('Right')).toBeTruthy();
    });

    it('caps nested depth to prevent runaway recursion', () => {
        const makeNested = (n: number): BlockNode =>
            n === 0
                ? { blockType: 'alert', severity: 'info', title: `inner-${n}`, dismissible: false }
                : { blockType: 'columns', columns: [{ width: 'full', content: [makeNested(n - 1)] }] };
        const { container } = render(<BlockRenderer blocks={[makeNested(10)]} context={ctx} />);
        expect(container.textContent ?? '').not.toContain('inner-0');
    });
});

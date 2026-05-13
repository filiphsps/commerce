// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CollectionBlock } from './CollectionBlock';
import { OverviewBlock } from './OverviewBlock';
import type { BlockRenderContext, CollectionBlockNode, OverviewBlockNode, VendorsBlockNode } from './types';
import { VendorsBlock } from './VendorsBlock';

const makeCtx = (overrides: Partial<BlockRenderContext['loaders']> = {}): BlockRenderContext => ({
    shop: { id: 'shop_1', domain: 'example.com' },
    locale: { code: 'en-US' },
    loaders: {
        loadCollection: vi.fn(async () => ({
            handle: 'candy',
            title: 'Candy',
            products: [{ handle: 'p1', title: 'Sour Worms' }],
        })),
        loadVendors: vi.fn(async () => [{ name: 'Vendor A', productCount: 4 }]),
        loadOverview: vi.fn(async () => [{ handle: 'p1', title: 'Sour Worms' }]),
        ...overrides,
    },
});

describe('Shopify-aware blocks', () => {
    it('CollectionBlock calls loader with handle + limit and renders products', async () => {
        const ctx = makeCtx();
        const block: CollectionBlockNode = { blockType: 'collection', handle: 'candy', layout: 'grid', limit: 8 };
        const element = (await CollectionBlock({ block, context: ctx })) as ReactElement;
        const { container } = render(element);
        expect(container.textContent ?? '').toContain('Sour Worms');
        expect(ctx.loaders.loadCollection).toHaveBeenCalledWith(expect.objectContaining({ handle: 'candy', limit: 8 }));
    });

    it('CollectionBlock returns null when loader yields nothing', async () => {
        const ctx = makeCtx({ loadCollection: vi.fn(async () => null) });
        const block: CollectionBlockNode = { blockType: 'collection', handle: 'missing', layout: 'grid', limit: 8 };
        const element = await CollectionBlock({ block, context: ctx });
        expect(element).toBeNull();
    });

    it('VendorsBlock renders the vendor list', async () => {
        const ctx = makeCtx();
        const block: VendorsBlockNode = { blockType: 'vendors', maxVendors: 12 };
        const element = (await VendorsBlock({ block, context: ctx })) as ReactElement;
        const { container } = render(element);
        expect(container.textContent ?? '').toContain('Vendor A');
    });

    it('OverviewBlock renders products from loader', async () => {
        const ctx = makeCtx();
        const block: OverviewBlockNode = { blockType: 'overview', source: 'latest', limit: 12 };
        const element = (await OverviewBlock({ block, context: ctx })) as ReactElement;
        const { container } = render(element);
        expect(container.textContent ?? '').toContain('Sour Worms');
        expect(ctx.loaders.loadOverview).toHaveBeenCalledWith(expect.objectContaining({ source: 'latest', limit: 12 }));
    });
});

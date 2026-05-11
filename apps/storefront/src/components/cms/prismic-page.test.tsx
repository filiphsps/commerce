import { describe, expect, it, vi } from 'vitest';
import PrismicPage from '@/components/cms/prismic-page';
import { renderRSC } from '@/utils/test/rsc';

vi.mock('@/utils/dictionary', () => ({
    getDictionary: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/cms/slice-zone', () => ({
    SliceZone: Object.assign(
        ({ data }: { data?: unknown[] }) => <div data-testid="slice-zone-output">{(data?.length ?? 0)} slices</div>,
        { skeleton: () => <div data-testid="slice-zone-skeleton" /> },
    ),
}));

vi.mock('@/slices', () => ({ components: {} }));

const baseShop = {
    id: 'mock-shop-id',
    domain: 'staging.demo.nordcom.io',
    commerceProvider: { type: 'shopify', domain: 'mock.shop' },
} as any;

const baseLocale = { code: 'en-US', language: 'EN', country: 'US' } as any;

describe('components', () => {
    describe('PrismicPage', () => {
        it('returns null when no page and no slices are provided', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const ui = await renderRSC(() =>
                PrismicPage({ shop: baseShop, locale: baseLocale, handle: 'test' }),
            );
            expect(ui.container.textContent).toBe('');
            expect(warnSpy).toHaveBeenCalled();
            ui.unmount();
        });

        it('returns null when page has no slices', async () => {
            const ui = await renderRSC(() =>
                PrismicPage({
                    shop: baseShop,
                    locale: baseLocale,
                    handle: 'test',
                    page: { slices: [] } as any,
                }),
            );
            expect(ui.container.textContent).toBe('');
            ui.unmount();
        });

        it('renders the SliceZone when slices are provided', async () => {
            const ui = await renderRSC(() =>
                PrismicPage({
                    shop: baseShop,
                    locale: baseLocale,
                    handle: 'test',
                    slices: [{ id: 's1' }, { id: 's2' }] as any,
                }),
            );
            expect(ui.container.textContent).toContain('2 slices');
            ui.unmount();
        });

        it('renders the SliceZone when page has slices', async () => {
            const ui = await renderRSC(() =>
                PrismicPage({
                    shop: baseShop,
                    locale: baseLocale,
                    handle: 'test',
                    page: { slices: [{ id: 's1' }, { id: 's2' }, { id: 's3' }] } as any,
                }),
            );
            expect(ui.container.textContent).toContain('3 slices');
            ui.unmount();
        });
    });
});

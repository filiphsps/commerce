import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockNavItem } from '@/utils/test/fixtures';
import { renderRSC } from '@/utils/test/rsc';

vi.mock('@/components/link', () => ({
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

const { HeaderNavigation } = await import('./header-navigation');

const en = Locale.from('en-US');

describe('<HeaderNavigation>', () => {
    it('returns null when items is empty', async () => {
        const ui = await renderRSC(() => HeaderNavigation({ items: [], locale: en }));
        expect(ui.container.innerHTML).toBe('');
    });

    it('renders a plain link for an item without children', async () => {
        const items = [
            mockNavItem({
                link: {
                    kind: 'page',
                    label: 'Shop',
                    page: { slug: 'shop' } as never,
                    openInNewTab: false,
                },
            }),
        ];
        const ui = await renderRSC(() => HeaderNavigation({ items, locale: en }));
        const link = ui.container.querySelector('a[href="/en-US/shop/"]');
        expect(link?.textContent).toBe('Shop');
    });

    it('renders a button (HeaderMenuTrigger) for an item with children', async () => {
        const items = [
            mockNavItem({
                link: {
                    kind: 'page',
                    label: 'Categories',
                    page: { slug: 'categories' } as never,
                    openInNewTab: false,
                },
                items: [
                    {
                        id: 'c1',
                        link: { kind: 'page', label: 'Hats', page: { slug: 'hats' } as never, openInNewTab: false },
                    },
                ] as never,
            }),
        ];
        const ui = await renderRSC(() => HeaderNavigation({ items, locale: en }));
        // Trigger is a <button> (client component) — the RSC renders the button host.
        expect(ui.container.querySelector('button')?.textContent).toContain('Categories');
    });
});

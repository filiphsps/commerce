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

    // Regression guard: the mega-menu dropdown.
    describe('dropdown visibility', () => {
        const renderNav = async () => {
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
                            link: {
                                kind: 'page',
                                label: 'Hats',
                                page: { slug: 'hats' } as never,
                                openInNewTab: false,
                            },
                        },
                    ] as never,
                }),
            ];
            return renderRSC(() => HeaderNavigation({ items, locale: en }));
        };

        it('does not clip vertical overflow at md+ (would hide the mega-menu panel)', async () => {
            const ui = await renderNav();
            const nav = ui.container.querySelector('nav');
            expect(nav).not.toBeNull();
            const className = nav?.className ?? '';
            // Any unconditional `overflow-y-{hidden,clip}` or md-scoped
            // hidden/clip would clip the absolutely-positioned dropdown.
            // None of these can be on the nav.
            expect(className).not.toMatch(/(?:^|\s)overflow-hidden(?:\s|$)/);
            expect(className).not.toMatch(/(?:^|\s)overflow-y-hidden(?:\s|$)/);
            expect(className).not.toMatch(/(?:^|\s)overflow-y-clip(?:\s|$)/);
            expect(className).not.toMatch(/(?:^|\s)md:overflow-hidden(?:\s|$)/);
            expect(className).not.toMatch(/(?:^|\s)md:overflow-y-hidden(?:\s|$)/);
            expect(className).not.toMatch(/(?:^|\s)md:overflow-y-clip(?:\s|$)/);
        });

        it('scopes mobile overflow utilities behind max-md: so md+ inherits visible overflow', async () => {
            const ui = await renderNav();
            const nav = ui.container.querySelector('nav');
            const className = nav?.className ?? '';
            // Mobile horizontal-scroll affordance must stay mobile-only.
            expect(className).toContain('max-md:overflow-x-auto');
            expect(className).toContain('max-md:overflow-y-clip');
        });

        // `.overflow-x-shadow` is a project-wide utility that sets
        // `overflow-x: auto` unconditionally. CSS coerces the implicit
        // `overflow-y: visible` to `auto` in that case, which clips the
        // absolutely-positioned mega-menu dropdown at the nav boundary.
        // Keep this nav free of that class.
        it('does not use overflow-x-shadow (would coerce overflow-y to auto)', async () => {
            const ui = await renderNav();
            const nav = ui.container.querySelector('nav');
            expect(nav?.className).not.toContain('overflow-x-shadow');
        });
    });
});

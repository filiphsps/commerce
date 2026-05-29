import type { OnlineShop } from '@nordcom/commerce-db';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale, LocaleDictionary } from '@/utils/locale';

// Stub the four chrome leaves so the composition (slot order + visibility) is what's under test, not
// each leaf's Shopify/Apollo data layer (pinned by their own tests). Header/Footer are default exports
// carrying a static `.skeleton`; InfoBar is a named export; PageContent is a default export.
vi.mock('@/components/footer/footer', () => ({
    default: Object.assign(() => <footer data-testid="footer" />, {
        skeleton: () => <div data-testid="footer-skeleton" />,
    }),
}));
vi.mock('@/components/header/header', () => ({
    default: Object.assign(() => <header data-testid="header" />, {
        skeleton: () => <div data-testid="header-skeleton" />,
    }),
}));
vi.mock('@/components/header/info-bar', () => ({
    InfoBar: () => <section data-testid="info-bar" />,
}));
vi.mock('@/components/page-content', () => ({
    default: ({ children }: { children?: import('react').ReactNode }) => (
        <article data-testid="page-content">{children}</article>
    ),
}));

// Replace the real flag factory (its evaluation is covered by `section.test.ts`) with a controllable
// stub so a test can hide a slot by id. `vi.hoisted` makes the mutable set reachable from the hoisted
// `vi.mock` factory.
const { hiddenSections } = vi.hoisted(() => ({ hiddenSections: new Set<string>() }));
vi.mock('@/utils/flags/definitions/section', () => ({
    sectionEnabled: (id: string) => ({ evaluate: () => !hiddenSections.has(id) }),
}));

import ShopLayout from './shop-layout';

const shop = { id: 'shop-1', domain: 'shop.test' } as unknown as OnlineShop;
const locale = { code: 'en-US', country: 'US' } as unknown as Locale;
const i18n = {} as unknown as LocaleDictionary;
const children = <div data-testid="page-children" />;

/**
 * Reads the ordered `key` of each chrome slot the layout composed. `ShopLayout` renders its slots as a
 * single mapped array child of `<main>`, so the keys are the proof of resolved slot order and presence
 * without rendering the (async) slot subtrees.
 *
 * @param element - The `<main>` element returned by `ShopLayout` or `ShopLayout.skeleton`.
 * @returns The slot keys in render order (e.g. `['layout.info-bar', …]`).
 */
function slotKeys(element: ReactElement): Array<string | null> {
    const slots = (element.props as { children: ReactElement[] }).children;
    return slots.map((slot) => slot.key);
}

describe('ShopLayout chrome composition', () => {
    beforeEach(() => {
        hiddenSections.clear();
    });

    it('renders the historical chrome order with every slot when un-customized (byte-identical default)', async () => {
        const element = await ShopLayout({ shop, locale, i18n, children });
        expect(slotKeys(element)).toEqual(['layout.info-bar', 'layout.header', 'layout.main', 'layout.footer']);
    });

    it('renders the default chrome leaves in DOM order with content hosting the page children', async () => {
        const element = await ShopLayout({ shop, locale, i18n, children });
        const { container } = render(element);
        const markers = Array.from(container.querySelectorAll('[data-testid]')).map((node) =>
            node.getAttribute('data-testid'),
        );
        expect(markers).toEqual(['info-bar', 'header', 'page-children', 'footer']);
    });

    it('reorders the chrome from a per-shop layout override', async () => {
        const element = await ShopLayout({
            shop,
            locale,
            i18n,
            children,
            layout: ['footer', 'content', 'header', 'info-bar'],
        });
        expect(slotKeys(element)).toEqual(['layout.footer', 'layout.main', 'layout.header', 'layout.info-bar']);
    });

    it('hides a non-required slot toggled off by its section flag', async () => {
        hiddenSections.add('info-bar');
        const element = await ShopLayout({ shop, locale, i18n, children });
        expect(slotKeys(element)).toEqual(['layout.header', 'layout.main', 'layout.footer']);
    });

    it('always renders the required content slot even when its section flag is off', async () => {
        hiddenSections.add('content');
        const element = await ShopLayout({ shop, locale, i18n, children });
        expect(slotKeys(element)).toContain('layout.main');
    });

    it('renders the default chrome order for the skeleton placeholder', () => {
        const element = ShopLayout.skeleton();
        expect(slotKeys(element)).toEqual(['layout.info-bar', 'layout.header', 'layout.main', 'layout.footer']);
    });
});

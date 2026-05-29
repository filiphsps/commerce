import 'server-only';

import { resolveChromeLayout } from '@nordcom/commerce-cms/layout';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { HTMLProps, ReactNode } from 'react';

import { sectionEnabled } from '@/utils/flags/definitions/section';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { CHROME_SLOTS } from './chrome-slots';

export type ShopLayoutProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    children: ReactNode;
    /**
     * Opt-in per-shop chrome composition override (ordered slot ids). Omitted (the default) resolves
     * to the historical hardcoded order, so an un-customized shop is byte-identical. A tenant
     * reorders/toggles chrome slots via this config + the P3-6 `section:<id>` flags, no deploy.
     */
    layout?: readonly string[];
} & Omit<HTMLProps<HTMLDivElement>, 'data' | 'className'>;

/**
 * Static grid container class for the chrome. Kept as a literal (not derived from the resolved order)
 * because Tailwind only emits CSS for class strings it can statically extract; a runtime-built
 * `grid-template-areas` would force inline styles and break the byte-identical default. Each chrome
 * leaf pins itself to its named grid area, so toggling a slot off collapses its `auto` row cleanly
 * and the remaining slots stay in place.
 */
const CHROME_GRID_CLASS =
    "grid min-h-screen grid-cols-[100%] grid-rows-[auto_auto_1fr_auto] [grid-template-areas:'info-bar''header''content''footer']";

/**
 * Async server component composing the full-page chrome grid (info-bar, header, content, footer) from
 * the resolved per-shop layout. Slot order comes from {@link resolveChromeLayout} (defaulting to the
 * historical hardcoded order); slot visibility comes from the P3-6 `section:<id>` flags evaluated
 * cache-safely against `shop`. The non-removable `content` outlet always renders. With no override and
 * no section flags the resolved composition equals `[info-bar, header, content, footer]`, all visible,
 * so this renders byte-identically to the pre-P4-2 inline JSX.
 *
 * @param props.shop - Shop record forwarded to all chrome slots and used to evaluate section flags.
 * @param props.locale - Active locale forwarded to all chrome slots.
 * @param props.i18n - Locale dictionary forwarded to all chrome slots.
 * @param props.children - Main page content rendered in the content slot.
 * @param props.layout - Optional ordered slot-id override; omitted resolves to the default order.
 * @returns The main grid container element.
 */
const ShopLayout = async ({ shop, locale, i18n, children, layout }: ShopLayoutProps) => {
    const slots = resolveChromeLayout({
        order: layout,
        // Inside the `CachedShell` 'use cache' scope → sync `.evaluate(shop)`. Trade-offs in defineFlag JSDoc.
        isVisible: (id) => sectionEnabled(id).evaluate(shop),
    });
    const args = { shop, locale, i18n, children };

    return <main className={CHROME_GRID_CLASS}>{slots.map((id) => CHROME_SLOTS[id].render(args))}</main>;
};

/**
 * Loading placeholder mirroring the default chrome composition. Renders the byte-identical default
 * order (section flags are not evaluated for the skeleton — it precedes content resolution), so it
 * stays a 4-row grid of empty info-bar div, header skeleton, page-content, and footer skeleton.
 *
 * @returns The skeleton grid container element.
 */
ShopLayout.skeleton = () => (
    <main className={CHROME_GRID_CLASS}>{resolveChromeLayout().map((id) => CHROME_SLOTS[id].renderSkeleton())}</main>
);

ShopLayout.displayName = 'Nordcom.Layout.ShopLayout';
export default ShopLayout;

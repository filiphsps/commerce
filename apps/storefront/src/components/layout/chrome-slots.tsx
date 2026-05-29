import 'server-only';

import type { ChromeSlotId } from '@nordcom/commerce-cms/layout';
import type { OnlineShop } from '@nordcom/commerce-db';
import { Fragment, type ReactNode, Suspense } from 'react';

import Footer from '@/components/footer/footer';
import Header from '@/components/header/header';
import { InfoBar } from '@/components/header/info-bar';
import PageContent from '@/components/page-content';

import type { Locale, LocaleDictionary } from '@/utils/locale';

/**
 * Render inputs shared by every chrome slot. Mirrors the props `ShopLayout` historically forwarded to
 * its four hardcoded children, so a slot's output is identical to the pre-P4-2 inline JSX.
 */
export type ChromeSlotArgs = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    children: ReactNode;
};

/**
 * One entry in {@link CHROME_SLOTS}: the live and skeleton renderers for a single chrome slot. Each
 * returned node carries the slot's historical `key` so the slot host can render the resolved order as
 * a keyed array without changing reconciliation identity or DOM output.
 */
export type ChromeSlotEntry = {
    render: (args: ChromeSlotArgs) => ReactNode;
    renderSkeleton: () => ReactNode;
};

/**
 * Maps every {@link ChromeSlotId} to its storefront renderers. This is the single registration point
 * for the chrome slot host: `Record<ChromeSlotId, …>` makes the mapping exhaustive, so a slot added to
 * the shared CMS layout surface forces a matching entry here. Each entry reproduces the exact JSX
 * (`Suspense` key, fallback, component call) that `ShopLayout` emitted inline before slot composition,
 * so an un-customized shop renders byte-identically.
 */
export const CHROME_SLOTS: Record<ChromeSlotId, ChromeSlotEntry> = {
    'info-bar': {
        render: ({ shop, locale, i18n }) => (
            <Suspense key="layout.info-bar" fallback={<Fragment />}>
                <InfoBar shop={shop} locale={locale} i18n={i18n} />
            </Suspense>
        ),
        // The pre-P4-2 skeleton placed an empty `<div>` in the info-bar row; preserved verbatim.
        renderSkeleton: () => <div key="layout.info-bar" />,
    },
    header: {
        render: ({ shop, locale, i18n }) => (
            <Suspense key="layout.header" fallback={<Header.skeleton />}>
                <Header domain={shop.domain} locale={locale} i18n={i18n} />
            </Suspense>
        ),
        renderSkeleton: () => <Header.skeleton key="layout.header" />,
    },
    content: {
        render: ({ children }) => (
            <Suspense key="layout.main" fallback={<PageContent as="article" primary={true} />}>
                {children}
            </Suspense>
        ),
        renderSkeleton: () => <PageContent key="layout.main" as="article" primary={true} />,
    },
    footer: {
        render: ({ shop, locale, i18n }) => (
            <Suspense key="layout.footer" fallback={<Footer.skeleton />}>
                <Footer shop={shop} locale={locale} i18n={i18n} />
            </Suspense>
        ),
        renderSkeleton: () => <Footer.skeleton key="layout.footer" />,
    },
};

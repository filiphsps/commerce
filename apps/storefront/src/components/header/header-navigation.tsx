import type { OnlineShop } from '@nordcom/commerce-db';
import type { HTMLProps } from 'react';
import type { Locale, LocaleDictionary } from '@/utils/locale';

type HeaderNavigationProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    slices: unknown[];
} & HTMLProps<HTMLDivElement>;

/**
 * Legacy Prismic-driven header navigation. Renders nothing until the new CMS
 * Header global's recursive nav-item field is wired in. Skeleton kept for
 * Suspense fallbacks in header.tsx.
 */
export function HeaderNavigation(_props: HeaderNavigationProps) {
    return null;
}
HeaderNavigation.displayName = 'Nordcom.Header.HeaderNavigation';

function skeleton() {
    return (
        <nav className="overflow-x-shadow flex w-full grow items-center justify-start gap-5 overflow-x-auto whitespace-nowrap px-2 py-[0.65rem] md:max-w-[var(--page-width)] md:flex-row md:overflow-hidden md:px-3 lg:gap-6">
            <div className="h-full w-14 rounded-lg" data-skeleton />
            <div className="h-full w-12 rounded-lg" data-skeleton />
            <div className="h-full w-28 rounded-lg" data-skeleton />
            <div className="h-full w-16 rounded-lg" data-skeleton />
            <div className="h-full w-14 rounded-lg" data-skeleton />
        </nav>
    );
}
HeaderNavigation.skeleton = skeleton as typeof skeleton & { displayName: string };
HeaderNavigation.skeleton.displayName = 'Nordcom.Header.HeaderNavigation.Skeleton';

import { Fragment, type HTMLProps, Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { components as menuSlices } from '@/slices/navigation';
import { cn } from '@/utils/tailwind';

import type { Slices } from '@/components/cms/slice-zone';
import { SliceZone } from '@/components/cms/slice-zone';

import type { Locale, LocaleDictionary } from '@/utils/locale';

type HeaderNavigationProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    slices: Slices;
} & HTMLProps<HTMLDivElement>;
export function HeaderNavigation({
    shop,
    locale,
    i18n,
    slices = [],
    children,
    className,
    ...props
}: HeaderNavigationProps) {
    return (
        <nav
            className={cn(
                'overflow-x-shadow flex w-full grow items-center justify-start gap-5 overflow-x-auto overflow-y-clip whitespace-nowrap px-2 md:max-w-[var(--page-width)] md:flex-row md:overflow-hidden md:px-3 lg:gap-6',
                className
            )}
            {...props}
        >
            <Suspense fallback={<Fragment />}>
                <SliceZone
                    shop={shop}
                    locale={locale}
                    i18n={i18n}
                    data={slices}
                    components={menuSlices}
                    context={{
                        isHeader: true
                    }}
                />
            </Suspense>

            {children as any}
        </nav>
    );
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

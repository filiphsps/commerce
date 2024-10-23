'use client';

import { capitalize, getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Ellipsis as EllipsisIcon
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';

import Link from '@/components/link';

import type { LocaleDictionary } from '@/utils/locale';
import type { ComponentProps } from 'react';

const ACTION_STYLES =
    'flex select-none items-center justify-center gap-1 text-center text-xs font-medium text-current transition-colors hover:text-primary';
const ITEM_STYLES =
    'flex h-8 min-w-8 select-none items-center justify-center rounded bg-transparent p-2 text-center text-sm font-medium text-current transition-colors hover:text-primary data-[selected]:bg-primary data-[selected]:font-bold data-[selected]:text-primary-foreground md:h-10';

export type PaginationProps = ComponentProps<'nav'> & {
    i18n: LocaleDictionary;
    knownFirstPage?: number;
    knownLastPage?: number;
    morePagesAfterKnownLastPage?: boolean;
};
export function Pagination({
    i18n,
    knownFirstPage = 1,
    knownLastPage = 1,
    morePagesAfterKnownLastPage = false
}: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (knownFirstPage === knownLastPage) {
        return null;
    }

    const { t } = getTranslations('common', i18n);

    const currentPage = (() => {
        const page = searchParams.get('page');
        if (!page || Number.isSafeInteger(page)) return 1;

        return Number.parseInt(page);
    })();

    let items = [];
    for (let i = knownFirstPage; i <= knownLastPage; i++) {
        const query = new URLSearchParams(searchParams);
        if (i === 1) {
            query.delete('page');
        } else {
            query.set('page', i.toString());
        }

        const search = query.toString();
        const url = `${pathname}${search ? `?${search}` : ''}`;

        if (i === currentPage) {
            items.push(
                <div key={url} className={ITEM_STYLES} data-selected>
                    {i}
                </div>
            );
            continue;
        }

        items.push(
            <Link
                key={url}
                className={ITEM_STYLES}
                title={capitalize(t('page-n', i.toString()))}
                href={url}
                prefetch={false}
            >
                {i}
            </Link>
        );
    }

    const previousHref = (() => {
        const query = new URLSearchParams(searchParams);
        if (currentPage <= 2) {
            query.delete('page');
        } else {
            query.set('page', (currentPage - 1).toString());
        }
        const search = query.toString();
        return `${pathname}${search ? `?${search}` : ''}`;
    })();
    const nextHref = (() => {
        const query = new URLSearchParams(searchParams);
        query.set('page', (currentPage + 1).toString());
        const search = query.toString();
        return `${pathname}${search ? `?${search}` : ''}`;
    })();

    return (
        <nav
            aria-label="pagination"
            className="overflow-x-shadow flex max-w-full flex-nowrap items-center gap-3 md:gap-4"
        >
            {currentPage !== 1 ? (
                <Link className={ACTION_STYLES} href={previousHref} prefetch={false}>
                    <ChevronLeftIcon className="stroke-2 text-inherit" />
                    {capitalize(t('previous'))}
                </Link>
            ) : (
                <div className={cn(ACTION_STYLES, 'cursor-not-allowed text-gray-400 hover:text-gray-400')}>
                    <ChevronLeftIcon className="stroke-2 text-inherit" />
                    {capitalize(t('previous'))}
                </div>
            )}

            <div className="flex items-center gap-1 md:flex-wrap">
                {items}

                {morePagesAfterKnownLastPage ? (
                    <div className={ACTION_STYLES}>
                        <EllipsisIcon />
                    </div>
                ) : null}
            </div>

            {currentPage !== knownLastPage ? (
                <Link className={ACTION_STYLES} href={nextHref} prefetch={true}>
                    {capitalize(t('next'))}
                    <ChevronRightIcon className="stroke-2 text-inherit" />
                </Link>
            ) : (
                <div className={cn(ACTION_STYLES, 'cursor-not-allowed text-gray-400 hover:text-gray-400')}>
                    {capitalize(t('next'))}
                    <ChevronRightIcon className="stroke-2 text-inherit" />
                </div>
            )}
        </nav>
    );
}
Pagination.displayName = 'Nordcom.Actionable.Pagination';

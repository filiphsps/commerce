'use client';

import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Ellipsis as EllipsisIcon,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ComponentProps } from 'react';
import Link from '@/components/link';
import type { LocaleDictionary } from '@/utils/locale';
import { capitalize, getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

const ACTION_STYLES =
    'flex select-none items-center justify-center gap-1 text-center text-xs font-medium text-current transition-colors hover:text-primary';
const ITEM_STYLES =
    'flex h-8 min-w-8 select-none items-center justify-center rounded bg-transparent p-2 text-center text-sm font-medium text-current transition-colors hover:text-primary data-[selected]:bg-primary data-[selected]:font-bold data-[selected]:text-primary-foreground md:h-10';

/**
 * Resolves the active page from a raw `page` search-param, clamped into the known range.
 *
 * A malformed param (`?page=abc`, an empty string, a negative or out-of-range number) must never
 * leak into the rendered links or the active-page highlight — the previous `Number.isSafeInteger`
 * guard ran against a string and so was always false, letting `NaN` propagate. Parse first, fall back
 * to `firstPage` when the result is not finite, then clamp to `[firstPage, lastPage]`.
 *
 * @param raw - The raw `page` query value (or `null` when absent).
 * @param firstPage - The first valid page number.
 * @param lastPage - The last known page number.
 * @returns A valid page number within `[firstPage, lastPage]`.
 */
export function resolveCurrentPage(raw: string | null, firstPage: number, lastPage: number): number {
    const parsed = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(parsed)) {
        return firstPage;
    }
    return Math.min(Math.max(parsed, firstPage), lastPage);
}

export type PaginationProps = ComponentProps<'nav'> & {
    i18n: LocaleDictionary;
    knownFirstPage?: number;
    knownLastPage?: number;
    morePagesAfterKnownLastPage?: boolean;
};
/**
 * URL-driven pagination nav that builds page links from the current search params.
 *
 * @param props.i18n - Locale dictionary for previous/next labels.
 * @param props.knownFirstPage - First page number; defaults to `1`.
 * @param props.knownLastPage - Last known page number; defaults to `1`.
 * @param props.morePagesAfterKnownLastPage - Shows an ellipsis indicator when further pages may exist.
 * @returns The pagination nav, or `null` when there is only one page.
 */
export function Pagination({
    i18n,
    knownFirstPage = 1,
    knownLastPage = 1,
    morePagesAfterKnownLastPage = false,
}: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (knownFirstPage === knownLastPage) {
        return null;
    }

    const { t } = getTranslations('common', i18n);

    const currentPage = resolveCurrentPage(searchParams.get('page'), knownFirstPage, knownLastPage);

    const items = [];
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
                <div key={url} className={ITEM_STYLES} aria-current="page" data-selected>
                    {i}
                </div>,
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
            </Link>,
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
                <div
                    className={cn(
                        ACTION_STYLES,
                        'text-(color:var(--text-muted)) hover:text-(color:var(--text-muted)) cursor-not-allowed',
                    )}
                >
                    <ChevronLeftIcon className="stroke-2 text-inherit" />
                    {capitalize(t('previous'))}
                </div>
            )}

            <div className="flex items-center gap-1 md:flex-wrap">
                {items}

                {morePagesAfterKnownLastPage ? (
                    <div className={ACTION_STYLES} aria-hidden="true">
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
                <div
                    className={cn(
                        ACTION_STYLES,
                        'text-(color:var(--text-muted)) hover:text-(color:var(--text-muted)) cursor-not-allowed',
                    )}
                >
                    {capitalize(t('next'))}
                    <ChevronRightIcon className="stroke-2 text-inherit" />
                </div>
            )}
        </nav>
    );
}
Pagination.displayName = 'Nordcom.Actionable.Pagination';

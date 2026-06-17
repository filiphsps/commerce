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
    const parsed = raw === null ? Number.NaN : Number(raw);
    if (!Number.isInteger(parsed)) {
        return firstPage;
    }
    return Math.min(Math.max(parsed, firstPage), lastPage);
}

type PaginationActionProps = {
    direction: 'previous' | 'next';
    label: string;
    href?: string;
    prefetch?: boolean;
};

/**
 * Previous/next pagination control rendered as a link when navigable, or a disabled marker at a bound.
 *
 * Threading the bound through an optional `href` keeps the enabled and disabled states in one place:
 * an absent `href` renders a non-interactive `<span aria-disabled>` (so assistive tech announces a
 * disabled control rather than stray text) instead of the prior bare `<div>`, while the chevron sits
 * before the label for `previous` and after it for `next`.
 *
 * @param props.direction - Which bound the control steps toward; sets the chevron side.
 * @param props.label - Localized, already-capitalized control label.
 * @param props.href - Target URL when navigable; omit to render the disabled state.
 * @param props.prefetch - Whether the link prefetches; ignored in the disabled state.
 * @returns The pagination action element.
 */
const PaginationAction = ({ direction, label, href, prefetch = false }: PaginationActionProps) => {
    const icon =
        direction === 'previous' ? (
            <ChevronLeftIcon className="stroke-2 text-inherit" />
        ) : (
            <ChevronRightIcon className="stroke-2 text-inherit" />
        );
    const content =
        direction === 'previous' ? (
            <>
                {icon}
                {label}
            </>
        ) : (
            <>
                {label}
                {icon}
            </>
        );

    if (!href) {
        return (
            <span
                className={cn(
                    ACTION_STYLES,
                    'text-(color:var(--text-muted)) hover:text-(color:var(--text-muted)) cursor-not-allowed',
                )}
                aria-disabled="true"
            >
                {content}
            </span>
        );
    }

    return (
        <Link className={ACTION_STYLES} href={href} prefetch={prefetch}>
            {content}
        </Link>
    );
};
PaginationAction.displayName = 'Nordcom.Actionable.PaginationAction';

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
            <PaginationAction
                direction="previous"
                label={capitalize(t('previous'))}
                href={currentPage !== 1 ? previousHref : undefined}
                prefetch={false}
            />

            <div className="flex items-center gap-1 md:flex-wrap">
                {items}

                {morePagesAfterKnownLastPage ? (
                    <div className={ACTION_STYLES} aria-hidden="true">
                        <EllipsisIcon />
                    </div>
                ) : null}
            </div>

            <PaginationAction
                direction="next"
                label={capitalize(t('next'))}
                href={currentPage !== knownLastPage ? nextHref : undefined}
                prefetch={true}
            />
        </nav>
    );
}
Pagination.displayName = 'Nordcom.Actionable.Pagination';

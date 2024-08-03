'use client';

import styles from '@/components/actionable/pagination.module.scss';
import overflowStyles from '@/styles/horizontal-overflow-scroll.module.scss';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { TbDots } from 'react-icons/tb';

import { cn } from '@/utils/tailwind';
import { usePathname, useSearchParams } from 'next/navigation';

import Link from '@/components/link';

import type { ComponentProps } from 'react';

export type PaginationProps = ComponentProps<'nav'> & {
    knownFirstPage?: number;
    knownLastPage?: number;
    morePagesAfterKnownLastPage?: boolean;
};
const Pagination = ({
    knownFirstPage = 0,
    knownLastPage = 0,
    morePagesAfterKnownLastPage = false
}: PaginationProps) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (knownFirstPage === knownLastPage) {
        return null;
    }

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
                <div key={url} className={styles.item} data-selected>
                    {i}
                </div>
            );
            continue;
        }

        items.push(
            <Link key={url} className={styles.item} href={url}>
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
        <nav role="navigation" aria-label="pagination" className={cn(styles.container, overflowStyles.container)}>
            {currentPage !== 1 ? (
                <Link className={styles.action} href={previousHref}>
                    <FiChevronLeft />
                    Prev
                </Link>
            ) : null}

            <div className={styles.content}>
                {items}

                {morePagesAfterKnownLastPage ? (
                    <div className={styles.ellipsis}>
                        <TbDots />
                    </div>
                ) : null}
            </div>

            {currentPage !== knownLastPage ? (
                <Link className={styles.action} href={nextHref}>
                    Next
                    <FiChevronRight />
                </Link>
            ) : null}
        </nav>
    );
};

Pagination.displayName = 'Nordcom.Pagination';
export default Pagination;

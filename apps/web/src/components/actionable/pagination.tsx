'use client';

import styles from '@/components/actionable/pagination.module.scss';
import Link from '@/components/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ComponentProps } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { TbDots } from 'react-icons/tb';

export type PaginationProps = ComponentProps<'nav'> & {};
const Pagination = ({}: PaginationProps) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentPage = (() => {
        const page = searchParams.get('page');
        if (!page || Number.isSafeInteger(page)) return 1;

        return Number.parseInt(page);
    })();
    const knownFirstPage = 1;
    const knownLastPage = 5;
    const morePagesAfterKnownLastPage = true;

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
                <div className={styles.item} data-selected>
                    {i}
                </div>
            );
            continue;
        }

        items.push(
            <Link className={styles.item} href={url}>
                {i}
            </Link>
        );
    }

    const previousHref = (() => {
        const query = new URLSearchParams(searchParams);
        if (currentPage === 1) {
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
        <nav role="navigation" aria-label="pagination" className={styles.container}>
            {currentPage !== 1 ? (
                <Link className={styles.action} href={previousHref}>
                    <FiChevronLeft />
                    Previous
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

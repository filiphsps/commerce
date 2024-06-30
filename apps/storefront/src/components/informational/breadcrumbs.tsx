'use client';

import styles from '@/components/informational/breadcrumbs.module.scss';

import { FiChevronRight } from 'react-icons/fi';
import { usePathname } from 'next/navigation';

import type { Shop } from '@nordcom/commerce-database';

import { cn } from '@/utils/tailwind';

import Link from '@/components/link';

type BreadcrumbsProps = {
    shop: Shop;
    title?: string;
};
const Breadcrumbs = ({ shop, title }: BreadcrumbsProps) => {
    const route = usePathname();
    const path = route.split('/').slice(2, -1);

    if (!path || path.length <= 0) return null;

    const hrefs = path.map((_, index) => `/${path.slice(0, index + 1).join('/')}`);
    return (
        <section
            className={cn(styles.breadcrumbs, 'gap-1 rounded-lg px-1 py-2')}
            itemScope
            itemType="https://schema.org/BreadcrumbList"
        >
            <div
                className={cn(styles.item, 'gap-1')}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
            >
                <Link
                    className={cn(styles.link, 'rounded-lg px-1 text-sm')}
                    href="/"
                    itemType="https://schema.org/Thing"
                    itemProp="item"
                >
                    <span itemProp="name">{shop.name}</span>
                </Link>
                <meta itemProp="position" content="1" />

                <FiChevronRight className={styles.icon} />
            </div>

            {path.map((entry, index) => (
                <div
                    key={entry}
                    className={cn(styles.item, 'gap-1')}
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                >
                    <Link
                        className={cn(styles.link, 'rounded-lg px-1 text-sm')}
                        href={hrefs[index]!}
                        itemType="https://schema.org/Thing"
                        itemProp="item"
                    >
                        <span itemProp="name">{index === path.length - 1 ? title || entry : entry}</span>
                    </Link>
                    <meta itemProp="position" content={`${index + 2}`} />

                    {index + 1 < path.length ? <FiChevronRight className={styles.icon} /> : null}
                </div>
            ))}
        </section>
    );
};

export default Breadcrumbs;

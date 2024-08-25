'use client';

import styles from '@/components/informational/breadcrumbs.module.scss';
import overflowStyles from '@/styles/horizontal-overflow-scroll.module.scss';

import { FiChevronRight } from 'react-icons/fi';

import type { OnlineShop } from '@nordcom/commerce-db';

import { cn } from '@/utils/tailwind';
import { usePathname } from 'next/navigation';

import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';

type BreadcrumbsProps = {
    shop: OnlineShop;
    title?: string;
};
const Breadcrumbs = ({ shop, title }: BreadcrumbsProps) => {
    const { locale } = useShop();
    const route = usePathname();
    const path = route.split('/').slice(2, -1);

    if (path.length <= 0) {
        return null;
    }

    const textStyles = 'text-sm md:text-xs leading-none';
    const blockStyles = 'gap-1 lg:gap-2';

    const hrefs = path.map((_, index) => `/${path.slice(0, index + 1).join('/')}`);
    return (
        <section
            className={cn(styles.breadcrumbs, overflowStyles.container, blockStyles, 'rounded-lg p-2')}
            itemScope
            itemType="https://schema.org/BreadcrumbList"
        >
            <div
                className={cn(styles.item, blockStyles)}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
            >
                <Link
                    className={cn(styles.link, textStyles, 'rounded-lg')}
                    href="/"
                    itemType="https://schema.org/Thing"
                    itemProp="item"
                >
                    <span itemProp="name">
                        {shop.name}
                        {locale.country ? ` (${locale.country.toUpperCase()})` : ''}
                    </span>
                </Link>
                <meta itemProp="position" content="1" />

                <FiChevronRight className={styles.icon} />
            </div>

            {path.map((entry, index) => (
                <div
                    key={entry}
                    className={cn(styles.item, textStyles, blockStyles)}
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                >
                    <Link
                        className={cn(styles.link, textStyles, 'rounded-lg')}
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

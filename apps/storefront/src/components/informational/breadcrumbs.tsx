'use client';

import styles from '@/components/informational/breadcrumbs.module.scss';

import { FiChevronRight } from 'react-icons/fi';

import { cn } from '@/utils/tailwind';
import { usePathname } from 'next/navigation';

import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';

import type { Locale } from '@/utils/locale';

type BreadcrumbsProps = {
    locale: Locale;
    title?: string;
};
const Breadcrumbs = ({ locale, title }: BreadcrumbsProps) => {
    const { shop } = useShop();
    const route = usePathname();
    const path = route.split('/').slice(2, -1);

    if (path.length <= 0) {
        return null;
    }

    const textStyles = 'text-sm leading-none';
    const blockStyles = 'gap-1';

    const hrefs = path.map((_, index) => `/${path.slice(0, index + 1).join('/')}`);
    return (
        <section
            className={cn(
                styles.breadcrumbs,
                'overflow-x-shadow flex w-full max-w-full list-none flex-nowrap items-center justify-start overflow-hidden overflow-x-auto overscroll-x-contain whitespace-nowrap rounded-lg bg-gray-100 p-2 px-3 font-semibold text-gray-500',
                blockStyles
            )}
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

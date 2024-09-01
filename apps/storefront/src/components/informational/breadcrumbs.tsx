'use client';

import styles from '@/components/informational/breadcrumbs.module.scss';

import { Fragment } from 'react/jsx-runtime';

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

    const itemStyles = 'inline-flex justify-center items-center';
    const linkStyles = 'text-sm capitalize hover:text-primary leading-none';
    const iconStyles = 'text-gray-300 text-lg font-normal';

    const hrefs = path.map((_, index) => `/${path.slice(0, index + 1).join('/')}`);
    return (
        <section
            className={cn(
                styles.breadcrumbs,
                'overflow-x-shadow flex w-full max-w-full list-none flex-nowrap items-center justify-start gap-2 overflow-hidden overflow-x-auto overscroll-x-contain whitespace-nowrap rounded-lg font-medium leading-none text-gray-700 md:gap-3'
            )}
            itemScope
            itemType="https://schema.org/BreadcrumbList"
        >
            <div className={itemStyles} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link className={linkStyles} href="/" itemType="https://schema.org/Thing" itemProp="item">
                    <span itemProp="name">
                        {shop.name}
                        {locale.country ? ` (${locale.country.toUpperCase()})` : ''}
                    </span>
                </Link>
                <meta itemProp="position" content="1" />
            </div>
            <span className={iconStyles}>/</span>

            {path.map((entry, index) => (
                <Fragment key={entry}>
                    <div
                        className={itemStyles}
                        itemProp="itemListElement"
                        itemScope
                        itemType="https://schema.org/ListItem"
                    >
                        <Link
                            className={linkStyles}
                            href={hrefs[index]!}
                            itemType="https://schema.org/Thing"
                            itemProp="item"
                        >
                            <span itemProp="name">{index === path.length - 1 ? title || entry : entry}</span>
                        </Link>
                        <meta itemProp="position" content={`${index + 2}`} />
                    </div>
                    {index + 1 < path.length ? <span className={iconStyles}>/</span> : null}
                </Fragment>
            ))}
        </section>
    );
};

export default Breadcrumbs;

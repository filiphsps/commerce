'use client';

import { Fragment } from 'react/jsx-runtime';

import { cn } from '@/utils/tailwind';
import { usePathname } from 'next/navigation';

import { JsonLd } from '@/components/json-ld';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';

import type { Locale } from '@/utils/locale';
import type { ReactNode } from 'react';
import type { BreadcrumbList, WithContext } from 'schema-dts';

type BreadcrumbsProps = {
    locale: Locale;
    title?: string | ReactNode | ReactNode[];
    className?: string;
};
const Breadcrumbs = ({ locale, title, className }: BreadcrumbsProps) => {
    const { shop } = useShop();
    const route = usePathname();
    const path = route.split('/').slice(2, -1);

    if (path.length <= 0) {
        return null;
    }

    const itemStyles = 'inline-flex justify-center items-center';
    const linkStyles = 'text-sm capitalize hover:text-primary leading-none';
    const iconStyles = 'text-gray-400 text-lg font-normal';

    const hrefs = path.map((_) => `/${path.slice(0, -1).join('/')}`);

    const jsonLd: WithContext<BreadcrumbList> = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': path.map((entry, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            ...(index === path.length - 1
                ? {
                      name: (typeof title === 'string' ? title : entry) || entry
                  }
                : {
                      name: entry,
                      item: `https://${shop.domain}/${locale.code}${hrefs[index]!}`
                  })
        }))
    };

    return (
        <>
            <JsonLd data={jsonLd} />

            <section
                className={cn(
                    '-mx-2 flex w-screen list-none flex-nowrap items-center justify-start gap-1 overflow-hidden overflow-x-auto overscroll-x-contain whitespace-nowrap rounded-lg px-2 font-medium leading-none text-gray-700 md:-mx-0 md:w-full md:max-w-full md:px-0',
                    className
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
                                className={cn(linkStyles, index === path.length - 1 && 'font-semibold text-gray-700')}
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
        </>
    );
};

export default Breadcrumbs;

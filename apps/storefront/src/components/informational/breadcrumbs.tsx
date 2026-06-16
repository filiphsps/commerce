'use client';

import { usePathname } from 'next/navigation';
import { Fragment } from 'react/jsx-runtime';
import type { BreadcrumbList, WithContext } from 'schema-dts';

import { JsonLd } from '@/components/json-ld';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';

import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

type BreadcrumbsProps = {
    locale: Locale;
    title?: string;
    className?: string;
};
/**
 * Client component rendering a breadcrumb trail from the current pathname with injected JSON-LD markup.
 *
 * @param props.locale - Active locale used to build fully-qualified schema.org URLs.
 * @param props.title - Overrides the label for the last breadcrumb entry.
 * @param props.className - Additional CSS class names.
 * @returns The breadcrumb strip with embedded JSON-LD, or `null` at the root path.
 */
const Breadcrumbs = ({ locale, title, className }: BreadcrumbsProps) => {
    const { shop } = useShop();
    const route = usePathname();
    const path = route.split('/').slice(2, -1);

    if (path.length <= 0) {
        return null;
    }

    const itemStyles = 'inline-flex justify-center items-center';
    const linkStyles = 'text-sm capitalize hover:text-primary leading-none';
    const iconStyles = 'text-(--text-muted) text-lg font-normal';

    // Each crumb links to its own cumulative path (`/a`, `/a/b`, …); Link re-adds the locale prefix.
    // The previous `path.map((_) => …)` ignored the index and pointed every crumb at the same URL.
    const hrefs = path.map((_, index) => `/${path.slice(0, index + 1).join('/')}`);

    const jsonLd: WithContext<BreadcrumbList> = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: path.map((entry, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            ...(index === path.length - 1
                ? {
                      name: title || entry,
                  }
                : {
                      name: entry,
                      item: `https://${shop.domain}/${locale.code}${hrefs[index]!}`,
                  }),
        })),
    };

    return (
        <>
            <JsonLd data={jsonLd} />

            <nav
                aria-label="Breadcrumb"
                className={cn(
                    '-mx-2 flex w-screen list-none flex-nowrap items-center justify-start gap-1 overflow-hidden overflow-x-auto overscroll-x-contain whitespace-nowrap rounded-lg px-2 font-medium text-(--text-muted) leading-none md:mx-0 md:w-full md:max-w-full md:px-0',
                    className,
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
                                className={cn(
                                    linkStyles,
                                    index === path.length - 1 && 'font-semibold text-(--text-muted)',
                                )}
                                href={hrefs[index]!}
                                aria-current={index === path.length - 1 ? 'page' : undefined}
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
            </nav>
        </>
    );
};

export default Breadcrumbs;

'use client';

import type { Shop } from '@/api/shop';
import { commonValidations } from '@/middleware/common-validations';
import type { Locale } from '@/utils/locale';
import { DefaultLocale, NextLocaleToLocale } from '@/utils/locale';
import BaseLink from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof BaseLink>, 'locale'> & {
    shop?: Shop;
    locale?: Locale;
};

// FIXME: i18n provider?
export default function Link({ shop, locale, href, prefetch, ...props }: Props) {
    if (typeof href !== 'string') {
        throw new Error(`Link href must be of type string. Received ${typeof href} instead.`);
    }

    const path = usePathname();
    // TODO: Use a more sensible fallback.
    locale = locale || NextLocaleToLocale(path.split('/')[1]) || DefaultLocale();

    // FIXME: There has to be a better and simpler way to do this.
    const host = typeof window !== 'undefined' ? shop?.domains.primary || window.location.host : undefined;
    let url = !host
        ? new URL(href, !href.includes(':') ? `https://${host}` : undefined)
        : {
              host: host, // TODO
              pathname: host && href.includes(host) ? href.split('?')[0].split(host)[1] : href.split('?')[0],
              searchParams: href.includes('?') ? `?${href.split('?')[1]}` : ''
          };

    if (href.startsWith('/') || url.host === host) {
        // Check if any lang (xx-YY) is already a part of the URL.
        if (!/\/[a-z]{2}-[A-Z]{2}\//.test(url.pathname)) {
            // Add locale to href.
            url.pathname = `/${locale.locale}${url.pathname}`;
        }
    }

    url = commonValidations(url as any);
    return (
        <BaseLink
            {...props}
            href={url.host !== host ? url : `${url.pathname}${url.searchParams}`}
            prefetch={prefetch || false}
        />
    );
}

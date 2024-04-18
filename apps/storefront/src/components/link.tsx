'use client';

import { type ComponentProps } from 'react';
import BaseLink from 'next/link';

import type { Shop } from '@nordcom/commerce-database';
import { TypeError } from '@nordcom/commerce-errors';

import { commonValidations } from '@/middleware/common-validations';
import { Locale } from '@/utils/locale';

import { useShop } from './shop/provider';

type Props = Omit<ComponentProps<typeof BaseLink>, 'locale'> & {
    shop?: Shop;
    locale?: Locale;
    href?: string;
};

const isInternal = (href: string, shop?: Shop): boolean => {
    // If the url starts with `/` we're obviously requesting an internal path.
    if (href.startsWith('/')) {
        return true;
    }

    // Next if shop is defined we can check if we're linking to ourselves.
    if (shop) {
        if (href.startsWith(`https://${shop.domain}`) || href.startsWith(`http://${shop.domain}`)) {
            return true;
        }
    }

    return false;
};

// FIXME: i18n provider?
export default function Link({ locale, href, prefetch, ...props }: Props) {
    const shop = useShop();

    if (typeof href !== 'string') {
        // TODO: Deal with `URL` as `href`.
        console.error(new TypeError(`Link's \`href\` must be of type string. Received \`${typeof href}\` instead.`));
        return null;
    }

    // Get the locale if it's not provided to us.
    try {
        locale = locale || shop.locale || Locale.current || Locale.default;
    } catch {
        locale = Locale.default;
    }

    const url = ((href: string, shop?: Shop): string | URL => {
        const internal = isInternal(href, shop);

        if (internal) {
            // It's possible that the internal link still includes the protocol,
            // if it does, remove it.
            if (href.startsWith('https://') || href.startsWith('http://')) {
                // Add the first slash since that would be removed by the `slice`.
                href = `/${href.split('://')[1]!.split('/').slice(1).join('/')}`;
            }

            // Perform some common fixups.
            href = commonValidations(href);

            // Check if locale is provided, if not add it.
            if (!/\/[a-z]{2}-[A-Z]{2}\//.test(href)) return `/${locale.code}${href}`;
            // Otherwise return as-is.
            else return href;
        }

        // Check if it's a special url (e.g. `tel:`, `mailto:`, etc)
        if (!href.startsWith('https://') && !href.startsWith('https://')) {
            return href;
        }

        // TODO: Should we validate that a protocol is provided?
        return new URL(href);
    })(href, shop.shop);

    return <BaseLink prefetch={prefetch || false} {...props} href={url} suppressHydrationWarning={true} />;
}
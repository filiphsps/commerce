'use client';

import { type ComponentProps } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { TypeError } from '@nordcom/commerce-errors';

import { commonValidations } from '@/middleware/common-validations';
import { Locale } from '@/utils/locale';
import BaseLink from 'next/link';

import { useShop } from '@/components/shop/provider';

import type { Url } from 'node:url';

export type LinkProps = {
    shop?: OnlineShop;
    locale?: Locale;
    href: Url | string;
} & Omit<ComponentProps<typeof BaseLink>, 'locale'>;

const isInternal = (href: string, shop?: OnlineShop): boolean => {
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

export default function Link({ locale, href, prefetch, ...props }: LinkProps) {
    const shop = useShop();

    if (!href || typeof href !== 'string') {
        // TODO: Deal with `URL` as `href`.
        console.error(new TypeError(`Link's \`href\` must be of type string. Received \`${typeof href}\` instead.`));
        return null;
    }

    // Get the locale if it's not provided to us.
    try {
        locale = !!(locale as any) ? locale : (shop.locale as any) || (Locale.current as any) || Locale.default;
    } catch (error: unknown) {
        console.error(error);
        locale = Locale.default;
    }

    const url = ((href: string = '', shop?: OnlineShop): string | URL => {
        const internal = isInternal(href, shop);

        if (internal) {
            // It's possible that the internal link still includes the protocol,
            // if it does, remove it.
            if (href.startsWith('https://') || href.startsWith('http://')) {
                // Add the first slash since that would be removed by the `slice`.
                href = `/${href.split('://')[1]!.split('/').slice(1).join('/')}` || '';
            }

            // Perform some common fixups.
            href = commonValidations(href);

            // Check if locale is provided, if not add it.
            if (!/\/[a-z]{2}-[A-Z]{2}\//.test(href)) {
                return `/${locale!.code}${href}`;
            } else {
                // Otherwise return as-is.
                return href;
            }
        }

        // Check if it's a special url (e.g. `tel:`, `mailto:`, etc)
        if (!href.startsWith('https://') && !href.startsWith('https://')) {
            return href;
        }

        // TODO: Should we validate that a protocol is provided?
        return new URL(href);
    })(href, shop.shop);

    return <BaseLink prefetch={prefetch || false} {...props} href={url} />;
}

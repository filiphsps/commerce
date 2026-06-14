'use client';

import type { Url } from 'node:url';

import type { OnlineShop } from '@nordcom/commerce-db';
import BaseLink from 'next/link';
import type { ComponentProps } from 'react';
import { useShop } from '@/components/shop/provider';
import { commonValidations } from '@/middleware/common-validations';
import { Locale } from '@/utils/locale';

export type LinkProps = {
    shop?: OnlineShop;
    locale?: Locale;
    href: Url | string;
} & Omit<ComponentProps<typeof BaseLink>, 'locale'>;

/**
 * Classifies `href` as internal by checking for a leading slash (relative path) or an exact protocol-plus-domain match against the current shop's domain.
 *
 * @param href - The URL string to check.
 * @param shop - Optional shop record used to detect self-referencing external URLs.
 * @returns `true` when the URL is relative or targets the current shop's domain.
 */
const isInternal = (href: string, shop?: OnlineShop): boolean => {
    if (href === '') {
        return true;
    } else if (!href) {
        return false;
    }

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

/**
 * Locale-aware wrapper around Next.js `Link` that injects the active locale into internal paths.
 *
 * @param props.locale - Explicit locale; falls back to shop context and `Locale.default`.
 * @param props.href - Destination URL; supports strings and `Url` objects.
 * @param props.prefetch - Forwarded to the underlying `BaseLink`; defaults to `false`.
 * @returns The rendered `BaseLink` element, or `null` when `href` is not a string.
 */
export default function Link({ locale, href, prefetch, ...props }: LinkProps) {
    const shop = useShop();

    if (typeof href !== 'string') {
        // Normalize WHATWG `URL` and Node's legacy `Url` objects to their string form; anything
        // without a usable `href` string is not a navigable target and renders nothing.
        const normalized = href instanceof URL ? href.href : typeof href.href === 'string' ? href.href : null;
        if (!normalized) {
            return null;
        }

        href = normalized;
    }

    // Get the locale if it's not provided to us.
    let resolvedLocale: Locale;
    try {
        resolvedLocale = locale ?? shop.locale ?? Locale.current ?? Locale.default;
    } catch {
        resolvedLocale = Locale.default;
    }

    const url = ((href: string = '', shop?: OnlineShop): string | URL => {
        const internal = isInternal(href, shop);

        if (internal) {
            // It's possible that the internal link still includes the protocol,
            // if it does, remove it.
            if (href.startsWith('https://') || href.startsWith('http://')) {
                // Add the first slash since that would be removed by the `slice`.
                const afterScheme = href.split('://')[1] ?? '';
                href = `/${afterScheme.split('/').slice(1).join('/')}` || '';
            }

            // Perform some common fixups.
            href = commonValidations(href);

            // Check if locale is provided, if not add it.
            if (!/\/[a-z]{2}-[A-Z]{2}\//.test(href)) {
                return `/${resolvedLocale.code}${href}`;
            } else {
                // Otherwise return as-is.
                return href;
            }
        }

        // Check if it's a special url (e.g. `tel:`, `mailto:`, etc)
        if (!href.startsWith('https://') && !href.startsWith('http://')) {
            return href;
        }

        // Reached only for absolute `http(s)://` URLs, so a protocol is guaranteed.
        return new URL(href);
    })(href, shop.shop);

    return <BaseLink prefetch={prefetch || false} {...props} href={url} />;
}

import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound, unstable_rethrow } from 'next/navigation';
import { Shop } from '@/api/_loaders';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { unsafe_cast } from '@/utils/unsafe-cast';
import type { LayoutParams } from './layout';

export async function generateMetadata({ params }: { params: LayoutParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    let locale: Locale;
    try {
        locale = Locale.from(localeData);
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        unstable_rethrow(error);
        throw error;
    }

    let shop: OnlineShop;
    try {
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        unstable_rethrow(error);
        throw error;
    }

    return {
        // Next 16: URL objects fail React-server-to-client serialization. Runtime
        // accepts strings; TS Metadata type lags. Cast is intentional.
        metadataBase: unsafe_cast<URL>(`https://${shop.domain}/${locale.code}/`),
        title: {
            absolute: `${shop.name} (${locale.country!})`.trim(),
            // Allow tenants to customize this.
            // For example allow them to use other separators
            // like `·`, `–`, `—` etc.
            template: `%s — ${shop.name} (${locale.country!})`,
        },
        icons: {
            icon: ['/favicon.png'],
            shortcut: ['/favicon.png'],
            apple: ['/apple-icon.png'],
        },
        robots: {
            follow: true,
            index: true,
        },
        referrer: 'origin',
        formatDetection: {
            email: false,
            address: false,
            telephone: false,
        },
        openGraph: {
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

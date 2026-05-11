import 'server-only';
import { Shop, type OnlineShop } from '@nordcom/commerce-db';
import { headers } from 'next/headers';
import { cache } from 'react';
import { Locale } from '@/utils/locale';

export type RequestContext = { shop: OnlineShop; locale: Readonly<{ code: string; language: string; country?: string }> };

export const getRequestContext = cache(async (): Promise<RequestContext | null> => {
    try {
        const h = await headers();
        const domain = h.get('x-shop-domain');
        const localeCode = h.get('x-locale');
        if (!domain || !localeCode) return null;

        const shop = await Shop.findByDomain(domain);
        const locale = Locale.from(localeCode);
        if (!shop || !locale) return null;

        return { shop: shop as OnlineShop, locale };
    } catch {
        return null;
    }
});

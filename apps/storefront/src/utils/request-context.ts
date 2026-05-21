import 'server-only';
import { type OnlineShop, Shop } from '@nordcom/commerce-db';
import { trace } from '@opentelemetry/api';
import { headers } from 'next/headers';
import { cache } from 'react';
import { Locale } from '@/utils/locale';

export type RequestContext = { shop: OnlineShop; locale: ReturnType<typeof Locale.from> };

export const getRequestContext = cache(async (): Promise<RequestContext | null> => {
    try {
        const h = await headers();
        const domain = h.get('x-shop-domain');
        const localeCode = h.get('x-locale');
        if (!domain || !localeCode) return null;

        const shop = await Shop.findByDomain(domain, {
            convert: true,
            populate: ['featureFlags.flag'],
        });
        const locale = Locale.from(localeCode);
        if (!shop || !locale) return null;

        return { shop: shop as OnlineShop, locale };
    } catch (error) {
        // Suppress during tests where headers() is unavailable.
        if (process.env.NODE_ENV !== 'test') {
            trace.getActiveSpan()?.addEvent('request_context.lookup_failed', {
                'error.message': (error as Error)?.message ?? String(error),
            });
        }
        return null;
    }
});

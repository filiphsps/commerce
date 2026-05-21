import 'server-only';

import { trace } from '@opentelemetry/api';
import { Shop } from '@/api/_loaders';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import type { LayoutParams } from './layout';

export type StaticParam = Awaited<LayoutParams>;

export async function generateStaticParams(): Promise<StaticParam[]> {
    try {
        const shops = await Shop.findAll();

        const params = (
            await Promise.all(
                shops.map(async ({ domain }): Promise<StaticParam[]> => {
                    try {
                        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
                        if (shop.domain.includes('demo')) return [];
                        return [{ domain: shop.domain, locale: Locale.from('en-US').code }];
                    } catch (error: unknown) {
                        trace.getActiveSpan()?.addEvent('static_params.shop_lookup_failed', {
                            'shop.domain': domain,
                            'error.message': (error as Error)?.message ?? String(error),
                        });
                        return [];
                    }
                }),
            )
        ).flat();

        return params.length > 0 ? params : [{ domain: NOT_FOUND_HANDLE, locale: Locale.default.code }];
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('static_params.shop_findall_failed', {
            'error.message': (error as Error)?.message ?? String(error),
        });
        return [{ domain: NOT_FOUND_HANDLE, locale: Locale.default.code }];
    }
}

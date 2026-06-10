import 'server-only';

import { trace } from '@opentelemetry/api';
import { Shop } from '@/api/_loaders';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import type { LayoutParams } from './layout';

export type StaticParam = Awaited<LayoutParams>;

/**
 * Generates the top-level `[domain]/[locale]` path segments for all shops at
 * build time from the SINGLE batched `Shop.findAll()` read. The previous
 * per-shop `findByDomain` re-fetch was an N+1 against the (Convex-backed) shop
 * seam that bought nothing — the demo filter only needs `domain`, which the
 * batch already carries — so this is the lone platform-wide call of the
 * per-build budget (`@/utils/build-budget`). Demo shops are skipped. Returns a
 * sentinel entry when no valid shops are found so Cache Components has at
 * least one path to render.
 *
 * @returns An array of `{ domain, locale }` params for each live shop.
 */
export async function generateStaticParams(): Promise<StaticParam[]> {
    try {
        const shops = await Shop.findAll();

        const params = shops
            .filter(({ domain }) => !domain.includes('demo'))
            .map(({ domain }) => ({ domain, locale: Locale.from('en-US').code }));

        return params.length > 0 ? params : [{ domain: NOT_FOUND_HANDLE, locale: Locale.default.code }];
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('static_params.shop_findall_failed', {
            'error.message': (error as Error)?.message ?? String(error),
        });
        return [{ domain: NOT_FOUND_HANDLE, locale: Locale.default.code }];
    }
}

import 'server-only';

import type { BusinessDatum } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { BusinessDataApi } from './store';

export type InfoBarApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * The info bar is a presentation surface for BusinessData (support contact
 * fields). This helper is a thin alias with a targeted name so call sites
 * read clearly; the underlying fetch is the same as `BusinessDataApi`.
 *
 * @param args - Fetch options forwarded to `BusinessDataApi`.
 * @returns The business data document, or `null` when unseeded.
 */
export async function InfoBarApi(args: InfoBarApiArgs): Promise<BusinessDatum | null> {
    return BusinessDataApi(args);
}

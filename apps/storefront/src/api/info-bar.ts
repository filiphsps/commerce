import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { type BusinessData, BusinessDataApi } from './store';

export type InfoBarApiArgs = { shop: OnlineShop; locale: Locale };

/**
 * The info bar is a presentation surface for business data (support contact
 * fields). This helper is a thin alias with a targeted name so call sites
 * read clearly; the underlying read is the same as `BusinessDataApi`.
 *
 * @param args - Options forwarded to `BusinessDataApi`.
 * @returns The business data, or `null` when unset.
 */
export async function InfoBarApi(args: InfoBarApiArgs): Promise<BusinessData | null> {
    return BusinessDataApi(args);
}

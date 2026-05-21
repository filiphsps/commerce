import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import type { Product, ProductFilters } from '@/api/product';
import { searchFilter } from '@/utils/flags/definitions';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import SearchContent from './search-content';

export type SearchContentGateProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    data: { products?: Product[]; productFilters?: ProductFilters; totalCount?: number };
};

export default async function SearchContentGate({ shop: _shop, locale, i18n, data }: SearchContentGateProps) {
    const showFilters = await searchFilter();
    return <SearchContent locale={locale} i18n={i18n} showFilters={showFilters} data={data} />;
}

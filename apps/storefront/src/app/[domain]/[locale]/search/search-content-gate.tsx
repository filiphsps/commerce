import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import type { Product, ProductFilters } from '@/api/product';
import { readFlag } from '@/utils/flags/read';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import SearchContent from './search-content';

export type SearchContentGateProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    data: { products?: Product[]; productFilters?: ProductFilters };
};

export default async function SearchContentGate({ shop, locale, i18n, data }: SearchContentGateProps) {
    const showFilters = await readFlag<boolean>(shop, 'search-filter', { codeDefaultValue: false });
    return <SearchContent locale={locale} i18n={i18n} showFilters={showFilters} data={data} />;
}

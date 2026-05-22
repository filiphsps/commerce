import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import type { Product, ProductFilters } from '@/api/product';
import ProductCard from '@/components/product-card';
import { searchFilter } from '@/utils/flags/definitions';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import SearchContent from './search-content';

export type SearchContentGateProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    data: { products?: Product[]; productFilters?: ProductFilters; totalCount?: number };
};

export default async function SearchContentGate({ shop, locale, i18n, data }: SearchContentGateProps) {
    const showFilters = await searchFilter();
    const { products = [], productFilters = [], totalCount } = data;

    const productCards = products.map((product) => (
        <ProductCard key={product.id} shop={shop} locale={locale} data={product} variant="horizontal-bare" />
    ));

    const skeletonCards = Array.from({ length: 6 }).map((_, index) => (
        <ProductCard.skeleton key={index} variant="horizontal-bare" />
    ));

    return (
        <SearchContent
            locale={locale}
            i18n={i18n}
            showFilters={showFilters}
            productCards={productCards}
            skeletonCards={skeletonCards}
            productFilters={productFilters}
            totalCount={totalCount}
        />
    );
}

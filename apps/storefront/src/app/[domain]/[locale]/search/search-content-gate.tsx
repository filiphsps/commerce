import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import type { Product, ProductFilters } from '@/api/product';
import ProductCard from '@/components/product-card';
import SearchProductCard from '@/components/products/search-product-card';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import SearchContent from './search-content';

export type SearchContentGateProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    showFilters: boolean;
    data: { products?: Product[]; productFilters?: ProductFilters; totalCount?: number };
};

export default function SearchContentGate({ shop, locale, i18n, showFilters, data }: SearchContentGateProps) {
    const { products = [], productFilters = [], totalCount } = data;

    const productCards = products.map((product) => (
        <SearchProductCard key={product.id} shop={shop} locale={locale} data={product} />
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

SearchContentGate.Skeleton = function SearchContentGateSkeleton() {
    return (
        <div className="flex flex-col gap-0">
            {Array.from({ length: 6 }).map((_, index) => (
                <ProductCard.skeleton key={index} variant="horizontal-bare" />
            ))}
        </div>
    );
};

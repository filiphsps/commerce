import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Product } from '@/api/product';
import ProductCardBadges from '@/components/product-card/primitives/product-card-badges';
import ProductCardCta from '@/components/product-card/primitives/product-card-cta';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import { ProductCardOptionsProvider } from '@/components/product-card/primitives/product-card-options-provider';
import ProductCardPicker from '@/components/product-card/primitives/product-card-picker';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import ProductCardRoot, {
    type ProductCardChrome,
    type ProductCardLayout,
} from '@/components/product-card/primitives/product-card-root';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';
import ProductCardTitle from '@/components/product-card/primitives/product-card-title';
import { getDictionary } from '@/utils/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale } from '@/utils/locale';

/**
 * Slim view of a Product passed to the client provider. Drops prose
 * description, SEO blocks, full image gallery, and other fields the card
 * never reads — keeps the RSC payload tight (Vercel server-serialization).
 */
export type ProductCardData = Pick<
    Product,
    'id' | 'handle' | 'title' | 'vendor' | 'availableForSale' | 'options' | 'variants' | 'featuredImage' | 'tags'
>;

/**
 * Shape a full Product into the slim view the client provider holds.
 *
 * @param product - Source product from Shopify.
 * @returns Slim ProductCardData with only fields the card needs.
 */
export function toProductCardData(product: Product): ProductCardData {
    return {
        id: product.id,
        handle: product.handle,
        title: product.title,
        vendor: product.vendor,
        availableForSale: product.availableForSale,
        options: product.options,
        variants: product.variants,
        featuredImage: product.featuredImage,
        tags: product.tags,
    };
}

export type ProductCardProps = {
    data: Product;
    shop: OnlineShop;
    locale: Locale;
    layout: ProductCardLayout;
    chrome: ProductCardChrome;
    ctaPlacement: string;
    pickerPresentation: 'auto' | 'float' | 'sheet' | 'inline';
    priority?: boolean;
    className?: string;
};

/**
 * Server-async orchestrator. Awaits the dictionary, computes the seed
 * variant and single-buyable flag, then mounts the client provider over
 * the chassis. Server primitives (Badges, Title, Price, StockUrgency)
 * render as children of the client provider via the children-pass
 * pattern — no RSC boundary crossings needed.
 */
export default async function ProductCard({
    data,
    shop,
    locale,
    layout,
    chrome,
    ctaPlacement,
    pickerPresentation,
    priority,
    className,
}: ProductCardProps) {
    if (!data?.variants?.edges?.[0]?.node) return null;

    const i18n = await getDictionary({ shop, locale });
    const slim = toProductCardData(data);
    const seedVariant = firstAvailableVariant(data) ?? data.variants.edges[0]!.node;

    const variantCount = data.variants?.edges?.length ?? 0;
    const isSingleBuyable = variantCount === 1 && seedVariant.availableForSale === true;

    return (
        <ProductCardOptionsProvider product={slim as Product} seedVariantId={seedVariant.id} isSingleBuyable={isSingleBuyable}>
            <ProductCardRoot data={slim as Product} layout={layout} chrome={chrome} className={className}>
                <div className="relative">
                    <ProductCardImage
                        product={data}
                        seedVariant={seedVariant}
                        priority={priority}
                        aspect={layout === 'horizontal' ? 'horizontal' : 'vertical'}
                    />
                    <ProductCardBadges data={data} i18n={i18n} />
                    <ProductCardCta placement={ctaPlacement} />
                </div>
                <div className="flex flex-col gap-1 pt-1">
                    {shop.showProductVendor && data.vendor ? (
                        <span className="text-xs font-semibold uppercase leading-none tracking-(--product-card-eyebrow-tracking) text-(--product-card-vendor-color)">
                            {data.vendor}
                        </span>
                    ) : null}
                    <ProductCardTitle shop={shop} data={data} />
                    <ProductCardPrice seedVariant={seedVariant} locale={locale} />
                    <ProductCardStockUrgency seedVariant={seedVariant} i18n={i18n} />
                </div>
                <ProductCardPicker
                    locale={locale}
                    i18n={i18n}
                    presentation={pickerPresentation}
                    ctaPlacement={ctaPlacement}
                    layout={layout}
                />
            </ProductCardRoot>
        </ProductCardOptionsProvider>
    );
}

ProductCard.displayName = 'Nordcom.ProductCard';

ProductCard.skeleton = ({
    layout = 'vertical' as ProductCardLayout,
    chrome = 'boxed' as ProductCardChrome,
}: {
    layout?: ProductCardLayout;
    chrome?: ProductCardChrome;
} = {}) => (
    <div
        data-skeleton
        data-layout={layout}
        data-chrome={chrome}
        className="relative flex min-h-72 w-full snap-center snap-always min-w-(--product-card-min-width) max-w-(--product-card-max-width)"
    />
);

(ProductCard.skeleton as unknown as { displayName: string }).displayName = 'Nordcom.ProductCard.Skeleton';

import type { Product, ProductVariant } from '@/api/product';
import { createProductSearchParams } from '@/api/product';
import VariantImageClient, { type SeedImage } from './variant-image-client';

export type VariantImageProps = {
    product: Product;
    seedVariant: ProductVariant;
    priority?: boolean;
    aspect?: 'vertical' | 'horizontal' | 'micro' | 'square';
    className?: string;
};

const pickSeedImage = (product: Product, seedVariant: ProductVariant): SeedImage | null => {
    const v = seedVariant.image;
    if (v?.url) {
        return {
            url: v.url,
            altText: v.altText ?? null,
            width: v.width ?? 800,
            height: v.height ?? 1000,
        };
    }
    const f = product.featuredImage;
    if (f?.url) {
        return {
            url: f.url,
            altText: f.altText ?? null,
            width: f.width ?? 800,
            height: f.height ?? 1000,
        };
    }
    const i = product.images?.edges?.[0]?.node;
    if (i?.url) {
        return {
            url: i.url,
            altText: i.altText ?? null,
            width: i.width ?? 800,
            height: i.height ?? 1000,
        };
    }
    return null;
};

const pickSwapImage = (product: Product, primary: SeedImage | null): SeedImage | null => {
    const second = product.images?.edges?.[1]?.node;
    if (!second?.url || !primary) return null;
    if (second.url === primary.url) return null;
    return {
        url: second.url,
        altText: second.altText ?? null,
        width: second.width ?? 800,
        height: second.height ?? 1000,
    };
};

const VariantImage = ({
    product,
    seedVariant,
    priority = false,
    aspect = 'vertical',
    className,
}: VariantImageProps) => {
    const initialImage = pickSeedImage(product, seedVariant);
    const swapImage = pickSwapImage(product, initialImage);
    const params = createProductSearchParams({ product });
    const href = `/products/${product.handle}/${params ? `?${params}` : ''}`;
    const title = `${product.vendor} ${product.title}`.trim();
    return (
        <VariantImageClient
            initialImage={initialImage}
            swapImage={swapImage}
            aspect={aspect}
            href={href}
            title={title}
            priority={priority}
            className={className}
        />
    );
};

VariantImage.displayName = 'Nordcom.ProductDisplay.VariantImage';
export default VariantImage;

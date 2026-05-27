import type { Product, ProductVariant } from '@/api/product';
import { createProductSearchParams } from '@/api/product';
import VariantImageClient, { type SeedImage } from './variant-image-client';

export type VariantImageProps = {
    product: Product;
    seedVariant: ProductVariant;
    priority?: boolean;
    aspect?: 'vertical' | 'horizontal' | 'square';
    className?: string;
};

/**
 * Resolves the primary image for a product card from the variant image, featured image, or first gallery image.
 *
 * @param product - Product providing featured and gallery images as fallbacks.
 * @param seedVariant - Variant whose image takes precedence when available.
 * @returns The resolved seed image, or `null` when no image source is found.
 */
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

/**
 * Returns the second product gallery image to use as a hover swap, or `null` when unavailable.
 *
 * @param product - Product providing the gallery image list.
 * @param primary - Already-resolved primary image used to skip duplicates.
 * @returns The swap image, or `null` when there is no distinct second gallery image.
 */
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

/**
 * Server-side shell that resolves the primary and swap images then passes them to `VariantImageClient`.
 *
 * @param props.product - Product providing image gallery and vendor/title for link text.
 * @param props.seedVariant - Initial variant whose image is used as the primary image source.
 * @param props.priority - When `true`, loads the primary image eagerly.
 * @param props.aspect - Aspect ratio applied to the image container.
 * @param props.className - Additional CSS class names forwarded to the client component.
 * @returns The `VariantImageClient` element.
 */
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

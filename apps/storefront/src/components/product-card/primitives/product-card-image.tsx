'use client';

import { Image } from '@shopify/hydrogen-react';
import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import { Image as ImageIcon } from 'lucide-react';
import { useMemo } from 'react';
import { createProductSearchParams } from '@/api/product';
import Link from '@/components/link';
import { useProductCardContext } from '@/components/product-card/context';
import { cn } from '@/utils/tailwind';

export type ProductCardImageProps = {
    priority?: boolean;
    className?: string;
};

const ProductCardImage = ({ priority: priorityOverride, className }: ProductCardImageProps) => {
    const { data: product, selected, hoveredImage, priority: ctxPriority, variant } = useProductCardContext();
    const priority = priorityOverride ?? ctxPriority;

    const primary = useMemo<ShopifyImage | undefined>(() => {
        if (hoveredImage?.url) {
            return hoveredImage as ShopifyImage;
        }
        if (selected?.image?.url) {
            return selected.image as ShopifyImage;
        }
        if (selected?.image?.id) {
            const match = product.images.edges.find((edge) => edge.node.id === selected.image?.id)?.node;
            if (match) return match;
        }
        if (product.featuredImage?.url) {
            return product.featuredImage;
        }
        return product.images.edges.at(0)?.node;
    }, [product, selected, hoveredImage]);

    const swap = useMemo<ShopifyImage | undefined>(() => {
        const second = product.images.edges.at(1)?.node;
        if (!second || !primary) return undefined;
        if (second.id === primary.id) return undefined;
        return second;
    }, [product.images.edges, primary]);

    const aspectClass =
        variant === 'micro'
            ? 'aspect-(--aspect-product-card-micro)'
            : variant.startsWith('horizontal')
              ? 'aspect-(--aspect-product-card-horizontal)'
              : 'aspect-(--aspect-product-card-vertical)';

    const title = `${product.vendor} ${product.title}`;
    const params = createProductSearchParams({ product });
    const href = `/products/${product.handle}/${params ? `?${params}` : ''}`;

    if (!primary) {
        return (
            <Link
                className={cn('group/header contents', className)}
                href={href}
                title={title}
                prefetch={priority}
                tabIndex={0}
            >
                <div
                    data-testid="product-card-image-placeholder"
                    className={cn(
                        'flex h-full w-full items-center justify-center bg-(--product-card-image-bg) text-(--product-card-vendor-color)',
                        'rounded-(--product-card-image-radius) p-(--product-card-image-padding)',
                        aspectClass,
                    )}
                    aria-hidden="true"
                >
                    <ImageIcon className="h-1/3 w-1/3 stroke-current" />
                </div>
            </Link>
        );
    }

    return (
        <Link
            className={cn('group/header contents', className)}
            href={href}
            title={title}
            prefetch={priority}
            tabIndex={0}
        >
            <div
                className={cn(
                    'relative overflow-hidden bg-(--product-card-image-bg)',
                    'rounded-(--product-card-image-radius) p-(--product-card-image-padding)',
                    aspectClass,
                )}
            >
                <Image
                    className={cn(
                        'h-full w-full object-contain object-center transition-transform',
                        '[transition-duration:var(--product-card-motion-hover-duration)]',
                        '[transition-timing-function:var(--product-card-motion-hover-ease)]',
                        'group-hover/header:scale-105',
                    )}
                    src={primary.url!}
                    alt={primary.altText ?? title}
                    height={primary.height ?? 100}
                    width={primary.width ?? 100}
                    sizes="(max-width: 768px) 50vw, 280px"
                    decoding="async"
                    draggable={false}
                    loading={priority ? 'eager' : 'lazy'}
                />

                {swap ? (
                    <Image
                        data-testid="product-card-image-swap"
                        className={cn(
                            'absolute inset-0 h-full w-full object-contain object-center p-(--product-card-image-padding)',
                            'opacity-0 transition-opacity',
                            '[transition-duration:var(--product-card-motion-image-swap-duration)]',
                            '[transition-timing-function:var(--product-card-motion-hover-ease)]',
                            'group-hover/header:opacity-100',
                            'motion-reduce:hidden',
                        )}
                        src={swap.url!}
                        alt={swap.altText ?? `${title} (alternate)`}
                        height={swap.height ?? 100}
                        width={swap.width ?? 100}
                        sizes="(max-width: 768px) 50vw, 280px"
                        decoding="async"
                        draggable={false}
                        loading="lazy"
                    />
                ) : null}
            </div>
        </Link>
    );
};

ProductCardImage.displayName = 'Nordcom.ProductCard.Image';
export default ProductCardImage;

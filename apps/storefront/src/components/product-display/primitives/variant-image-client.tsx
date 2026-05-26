'use client';

import { Image } from '@shopify/hydrogen-react';
import { Image as ImageIcon } from 'lucide-react';
import { useMemo } from 'react';
import Link from '@/components/link';
import { useMaybeProductOptions } from '@/components/product-options/context';
import { cn } from '@/utils/tailwind';

export type SeedImage = {
    url: string;
    altText: string | null;
    width: number;
    height: number;
};

export type VariantImageClientProps = {
    initialImage: SeedImage | null;
    swapImage: SeedImage | null;
    aspect: 'vertical' | 'horizontal' | 'micro' | 'square';
    href: string;
    title: string;
    priority: boolean;
    className?: string;
};

const aspectClass = (aspect: VariantImageClientProps['aspect']) => {
    if (aspect === 'micro') return 'aspect-(--aspect-product-card-micro)';
    if (aspect === 'horizontal' || aspect === 'square') return 'aspect-(--aspect-product-card-horizontal-square)';
    return 'aspect-(--aspect-product-card-vertical)';
};

const VariantImageClient = ({
    initialImage,
    swapImage,
    aspect,
    href,
    title,
    priority,
    className,
}: VariantImageClientProps) => {
    const ctx = useMaybeProductOptions();
    const selectedVariant = ctx?.selectedVariant;
    const hoveredVariant = ctx?.hoveredVariant;
    const variantImage = useMemo<SeedImage | null>(() => {
        const candidate = hoveredVariant?.image ?? selectedVariant?.image;
        if (!candidate?.url) return null;
        return {
            url: candidate.url,
            altText: candidate.altText ?? null,
            width: candidate.width ?? 800,
            height: candidate.height ?? 1000,
        };
    }, [hoveredVariant, selectedVariant]);
    const primary = variantImage ?? initialImage;

    if (!primary) {
        return (
            <Link href={href} title={title} prefetch={priority} className={cn('group/header contents', className)}>
                <div
                    data-testid="product-card-image-placeholder"
                    className={cn(
                        'product-card-image text-(color:var(--product-card-vendor-color)) flex size-full items-center justify-center rounded-(--product-card-image-radius) bg-(--product-card-image-bg) p-(--product-card-image-padding)',
                        aspectClass(aspect),
                    )}
                    aria-hidden="true"
                >
                    <ImageIcon className="h-1/3 w-1/3 stroke-current" />
                </div>
            </Link>
        );
    }

    return (
        <Link href={href} title={title} prefetch={priority} className={cn('group/header contents', className)}>
            <div
                className={cn(
                    'product-card-image relative overflow-hidden rounded-(--product-card-image-radius) bg-(--product-card-image-bg) p-(--product-card-image-padding)',
                    aspectClass(aspect),
                )}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
                <Image
                    className={cn(
                        'h-full w-full object-contain object-center transition-transform [transition-duration:var(--product-card-motion-hover-duration)] [transition-timing-function:var(--product-card-motion-hover-ease)] motion-safe:group-hover/header:scale-[1.04]',
                    )}
                    src={primary.url}
                    alt={primary.altText ?? title}
                    height={primary.height}
                    width={primary.width}
                    sizes="(max-width: 768px) 50vw, 280px"
                    decoding="async"
                    draggable={false}
                    loading={priority ? 'eager' : 'lazy'}
                />
                {swapImage ? (
                    <Image
                        data-testid="product-card-image-swap"
                        className={cn(
                            'absolute inset-0 h-full w-full object-contain object-center p-(--product-card-image-padding) opacity-0 transition-opacity [transition-duration:var(--product-card-motion-image-swap-duration)] [transition-timing-function:var(--product-card-motion-hover-ease)] motion-safe:group-hover/header:opacity-100 motion-reduce:hidden',
                        )}
                        src={swapImage.url}
                        alt={swapImage.altText ?? `${title} (alternate)`}
                        height={swapImage.height}
                        width={swapImage.width}
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

VariantImageClient.displayName = 'Nordcom.ProductDisplay.VariantImage.Client';
export default VariantImageClient;

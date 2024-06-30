'use client';

import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/utils/tailwind';
import { Image as ShopifyImage } from '@shopify/hydrogen-react';

import type { Image } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';

export type ProductGalleryProps = {
    initialImageId?: string | null;
    images: Image[] | null;
} & HTMLProps<HTMLDivElement>;
const ProductGallery = ({ initialImageId, images, className, ...props }: ProductGalleryProps) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [selected, setSelected] = useState<Image | null>(null);
    const [next, setNext] = useState<Image | null>(null);

    const setImage = useCallback(
        (image: Image) => {
            // Prevent the user from spamming the buttons.
            if (loading) return;

            setLoading(true);
            setNext(image);
        },
        [loading]
    );

    useEffect(() => {
        if (selected || !images) return;

        const target = initialImageId ? images.find(({ id }) => id === initialImageId) : images[0];
        if (!target) return;

        setImage(target);
    }, [, images, initialImageId]);

    if (!images || images.length <= 0) return null;

    const image = next || selected;
    const loadingProps = { ...(!image || loading ? { 'data-skeleton': true } : {}) };

    return (
        <section draggable={false} className={cn('flex flex-col gap-2', className)} {...props}>
            <div className="rounded-lg bg-gray-100 p-8 md:p-16" {...loadingProps}>
                {image ? (
                    <ShopifyImage
                        className={cn(
                            'opacity-1 aspect-square h-full w-full object-contain object-center transition-opacity duration-500',
                            loading && 'opacity-0 transition-none'
                        )}
                        src={image.url!}
                        alt={image.altText!}
                        title={image.altText!}
                        //width={500}
                        height={500}
                        sizes="(max-width: 920px) 90vw, 500px"
                        loading="eager"
                        decoding="async"
                        onLoad={() => {
                            setTimeout(() => setLoading(() => false), 250);

                            if (!next) return;
                            setSelected(() => next);
                            setNext(null);
                        }}
                    />
                ) : (
                    <div className="aspect-square h-full w-full" />
                )}
            </div>

            {image && images.length > 1 ? (
                <aside className="grid grid-cols-3 gap-2 md:grid-cols-4">
                    {images
                        .filter(({ id }) => image.id !== id)
                        .map((image, index) => {
                            return (
                                <button
                                    key={image.id}
                                    aria-label={`Enlarge image #${index + 1}`}
                                    onClick={() => setImage(image)}
                                    className={cn(
                                        'hover:border-primary appearance-none rounded-lg border-0 border-solid border-gray-300 bg-gray-100 p-4 transition-all hover:border-4 focus:border-4 md:p-8'
                                    )}
                                    {...loadingProps}
                                >
                                    <ShopifyImage
                                        className={cn(
                                            'aspect-square h-full w-full object-contain object-center transition-opacity duration-500',
                                            loading && 'opacity-0 transition-none'
                                        )}
                                        style={{ transitionDelay: `${(index + 1) * 250}ms` }}
                                        src={image.url!}
                                        alt={image.altText!}
                                        title={image.altText!}
                                        //width={175}
                                        height={175}
                                        sizes="(max-width: 920px) 75px, 175px"
                                        loading="eager"
                                        decoding="async"
                                    />
                                </button>
                            );
                        })}
                </aside>
            ) : null}
        </section>
    );
};

ProductGallery.displayName = 'Nordcom.Products.Gallery';
export { ProductGallery };

'use client';

import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';

export type ProductGalleryProps = {
    initialImageId?: string | null;
    images: ShopifyImage[] | null;
} & HTMLProps<HTMLDivElement>;
const ProductGallery = ({ initialImageId, images, className, ...props }: ProductGalleryProps) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [selected, setSelected] = useState<ShopifyImage | null>(null);
    const [next, setNext] = useState<ShopifyImage | null>(null);

    const setImage = useCallback(
        (image: ShopifyImage) => {
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
        <section draggable={false} className={cn(className)} {...props}>
            <div className="sticky top-36 flex flex-col gap-2 lg:gap-4">
                <div
                    className="relative aspect-[4/3] rounded-lg border-2 border-solid border-gray-100 bg-white p-8 md:p-16"
                    {...loadingProps}
                >
                    {image ? (
                        <Image
                            className={cn(
                                'opacity-1 h-full max-h-72 w-full object-contain object-center transition-opacity duration-500 md:max-h-[48rem] md:min-h-[36rem]',
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
                        <div className="h-full w-full" />
                    )}
                    {image?.altText ? (
                        <div className="absolute bottom-2 left-2 rounded-lg bg-gray-100 p-1 px-2 text-sm font-semibold text-gray-500 opacity-80">
                            {image.altText}
                        </div>
                    ) : null}
                </div>

                {image && images.length > 1 ? (
                    <aside className="grid grid-cols-4 gap-2 overflow-hidden lg:h-fit">
                        {images
                            .filter(({ id }) => image.id !== id)
                            .map((image, index) => {
                                return (
                                    <button
                                        key={image.id}
                                        aria-label={`Enlarge image #${index + 1}`}
                                        onClick={() => setImage(image)}
                                        className={cn(
                                            'hover:border-primary h-full appearance-none rounded-lg border-2 border-solid border-gray-100 bg-white transition-all md:p-8 lg:aspect-square lg:h-full lg:w-auto'
                                        )}
                                        {...loadingProps}
                                    >
                                        <Image
                                            className={cn(
                                                'h-14 w-14 object-contain object-center transition-opacity duration-500 md:aspect-square md:h-full md:w-full',
                                                loading && 'opacity-0 transition-none'
                                            )}
                                            style={{ transitionDelay: `${(index + 1) * 250}ms` }}
                                            src={image.url!}
                                            alt={image.altText!}
                                            title={image.altText!}
                                            width={175}
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
            </div>
        </section>
    );
};

ProductGallery.displayName = 'Nordcom.Products.Gallery';
export { ProductGallery };

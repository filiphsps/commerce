'use client';

import styles from '@/components/products/product-gallery.module.scss';
import type { Image } from '@shopify/hydrogen-react/storefront-api-types';
import NextImage from 'next/image';
import { useEffect, useState, type HTMLProps } from 'react';

export type ProductGalleryProps = {
    initialImageId?: string | null;
    images: Image[] | null;
} & HTMLProps<HTMLDivElement>;
const ProductGallery = ({ initialImageId, images, className, ...props }: ProductGalleryProps) => {
    const [selected, setSelected] = useState(initialImageId || images?.[0].id);

    useEffect(() => {
        if (!initialImageId) return;
        else if (initialImageId == selected) return;

        setSelected(initialImageId);
    }, [initialImageId]);

    if (!images || images.length <= 0) return null;

    const image = images.find((image) => image && image.id === selected) || images[0];
    return (
        <div draggable={false} className={`${styles.gallery}${className ? ` ${className}` : ''}`} {...props}>
            <section>
                <NextImage
                    src={image.url || image.src || ''}
                    alt={image.altText || ''}
                    title={image.altText || undefined}
                    width={250}
                    height={250}
                    sizes="(max-width: 920px) 125px, 500px"
                    priority
                />
            </section>

            {(images.length > 1 && (
                <aside>
                    {images.map((image) => (
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                        <div
                            key={image.id}
                            onClick={() => setSelected(image.id)}
                            className={`${styles.preview} ${image.id === selected ? styles.active : ''}`}
                        >
                            <NextImage
                                src={image.url}
                                alt={image.altText || ''}
                                title={image.altText || undefined}
                                width={75}
                                height={75}
                                sizes="(max-width: 920px) 50px, 250px"
                                priority
                            />
                        </div>
                    ))}
                </aside>
            )) ||
                null}
        </div>
    );
};

ProductGallery.displayName = 'Nordcom.Products.Gallery';
export { ProductGallery };

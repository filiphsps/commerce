'use client';

import styles from './image-grid.module.scss';

import { memo } from 'react';

import { deepEqual } from '@/utils/deep-equal';
import { PrismicNextImage } from '@prismicio/next';

import Link from '@/components/link';
import PageContent from '@/components/page-content';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `ImageGrid`.
 */
export type ImageGridProps = SliceComponentProps<Content.ImageGridSlice>;

/**
 * Component for "ImageGrid" Slices.
 */
const ImageGrid = ({ slice, index }: ImageGridProps): JSX.Element => {
    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {slice.items.map(({ href, title, image }) => (
                <Link key={href!} className={styles.item} href={href!} title={title!}>
                    <PrismicNextImage
                        style={{
                            width: '100%',
                            height: 'auto',
                            aspectRatio: '21 / 6',
                            objectFit: 'cover',
                            objectPosition: '20% center',
                            transition: '150ms ease-in-out'
                        }}
                        field={image}
                        width={300}
                        height={200}
                        sizes="(max-width: 950px) 250px, 25vw"
                        loader={undefined}
                        // If we're positioned high up in the page, we want to load the image
                        // immediately. Otherwise, we can wait until the browser decides to.
                        priority={index < 3}
                    />
                    <div className={styles['title-container']}>
                        <div className={styles.title}>{title}</div>
                    </div>
                </Link>
            ))}
        </PageContent>
    );
};
ImageGrid.displayName = 'Nordcom.Slices.ImageGrid';

ImageGrid.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice) return null;

    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        ></PageContent>
    );
};
(ImageGrid.skeleton as any).displayName = 'Nordcom.Slices.ImageGrid.skeleton';

export default memo(ImageGrid, deepEqual);

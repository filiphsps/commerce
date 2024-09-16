import 'server-only';

import styles from './image-grid.module.scss';

import { cn } from '@/utils/tailwind';
import Image from 'next/image';

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
            className={cn(styles.container, 'empty:hidden')}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {slice.items.map(({ href, title, image }) => {
                if (!image.url) {
                    return null;
                }

                return (
                    <Link key={href!} className={styles.item} href={href!} title={title!}>
                        <Image
                            role={image.alt ? undefined : 'presentation'}
                            src={image.url!}
                            alt={image.alt!}
                            width={300}
                            height={200}
                            quality={70}
                            style={{
                                width: '100%',
                                height: 'auto',
                                aspectRatio: '21 / 6',
                                objectFit: 'cover',
                                objectPosition: '20% center',
                                transition: '150ms ease-in-out'
                            }}
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
                );
            })}
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
(ImageGrid.skeleton as any).displayName = 'Nordcom.Slices.ImageGrid.Skeleton';

export default ImageGrid;

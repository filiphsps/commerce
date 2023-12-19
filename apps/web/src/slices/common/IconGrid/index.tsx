import PageContent from '@/components/page-content';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import Image from 'next/image';
import styles from './icon-grid.module.scss';

/**
 * Props for `IconGrid`.
 */
export type IconGridProps = SliceComponentProps<Content.IconGridSlice>;

/**
 * Component for "IconGrid" Slices.
 */
const IconGrid = ({ slice, index: order }: IconGridProps): JSX.Element => {
    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {slice.items.map((item, index) => (
                <div key={index} className={styles.item}>
                    {item.icon?.url ? (
                        <Image
                            className={styles.icon}
                            src={item.icon.url}
                            alt={item.icon.alt || ''}
                            width={35}
                            height={35}
                            decoding="async"
                            loading={order < 2 && index < 1 ? 'eager' : 'lazy'}
                            priority={order < 2 && index < 1}
                        />
                    ) : (
                        <div className={styles.icon} />
                    )}
                    <div className={styles.title}>{item.title}</div>
                </div>
            ))}
        </PageContent>
    );
};

IconGrid.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice) return null;

    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        />
    );
};

IconGrid.displayName = 'Nordcom.Slices.IconGrid';
export default IconGrid;

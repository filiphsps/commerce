import 'server-only';

import styles from './icon-grid.module.scss';

import { useMemo } from 'react';
import Image from 'next/image';

import type { Shop } from '@nordcom/commerce-database';

import PageContent from '@/components/page-content';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `IconGrid`.
 */
export type IconGridProps = SliceComponentProps<
    Content.IconGridSlice,
    {
        shop: Shop;
        locale: Locale;
        i18n: LocaleDictionary;
    }
>;

/**
 * Component for "IconGrid" Slices.
 */
const IconGrid = ({ slice, index: order }: IconGridProps) => {
    const icons = useMemo(
        () =>
            (slice.items || []).map(({ icon, title }, index) => {
                if (slice.items.length <= 0) {
                    return null;
                }

                const priority = order < 2 && index < 1;

                return (
                    <div key={index} className={styles.item}>
                        {icon.url ? (
                            <Image
                                className={styles.icon}
                                src={icon.url}
                                alt={icon.alt || ''}
                                width={35}
                                height={35}
                                decoding="async"
                                loading={priority ? 'eager' : 'lazy'}
                                priority={priority}
                                draggable={false}
                            />
                        ) : (
                            <div className={styles.icon} />
                        )}
                        <div className={styles.title}>{title}</div>
                    </div>
                );
            }),
        [slice.items]
    );

    if (!(slice as any)) {
        return null;
    }

    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            data-background={slice.primary.background || 'secondary'}
        >
            {icons}
        </PageContent>
    );
};
IconGrid.displayName = 'Nordcom.Slices.IconGrid';

IconGrid.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice) {
        return null;
    }

    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {(slice.items.length > 0 ? slice.items : []).map(({ title }, index) => (
                <div key={index} className={styles.item} data-skeleton>
                    <div className={styles.icon} />
                    <div className={styles.title}>{title}</div>
                </div>
            ))}
        </PageContent>
    );
};
(IconGrid.skeleton as any).displayName = 'Nordcom.Slices.IconGrid.Skeleton';

export default IconGrid;

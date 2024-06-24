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
    const items = useMemo(
        () =>
            (slice.items || []).map(({ icon, title }, index) => {
                const priority = order < 2;

                return (
                    <div key={`${title}_${index}`} className={styles.item}>
                        {icon.url ? (
                            <Image
                                className={styles.icon}
                                src={icon.url}
                                alt={icon.alt || ''}
                                width={35}
                                height={35}
                                quality={75}
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

    if (!slice || items.length <= 0) {
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
            {items}
        </PageContent>
    );
};
IconGrid.displayName = 'Nordcom.Slices.IconGrid';

IconGrid.skeleton = ({ slice }: IconGridProps) => (
    <PageContent as="section" className={styles.container} data-skeleton>
        {slice.items.map(({ title }, index) => (
            <div key={`${title}_${index}`} className={styles.item}>
                <div className={styles.icon} />
                <div className={styles.title}>{title}</div>
            </div>
        ))}
    </PageContent>
);

export default IconGrid;

import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import type { CollectionSliceFull } from '@/prismic/types';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { PrefetchData } from '@/utils/prefetch';
import type { FunctionComponent } from 'react';
import styles from './collection.module.scss';

interface FullCollectionProps {
    slice: {
        slice_type: 'collection';
        slice_label: null;
        id?: string | undefined;
    } & CollectionSliceFull;
    locale: Locale;
    i18n: LocaleDictionary;
    prefetch?: PrefetchData;
}
export const FullCollection: FunctionComponent<FullCollectionProps> = ({ slice, prefetch, i18n }) => {
    const collection = prefetch?.collections?.[slice.primary.handle!];
    if (!collection) {
        console.warn(`Collection ${slice.primary.handle} not found in prefetch data`);
        return null;
    }

    return (
        <PageContent
            className={`${styles.container} ${styles.full}`}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <CollectionBlock
                className={styles['full-collection']}
                data={collection as any}
                i18n={i18n}
                limit={250}
                showViewAll={false}
            />
        </PageContent>
    );
};

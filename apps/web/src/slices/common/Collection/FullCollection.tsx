import PageContent from '@/components/page-content';
import { CollectionBlock } from '@/components/products/collection-block';
import type { StoreModel } from '@/models/StoreModel';
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
    store: StoreModel;
    locale: Locale;
    i18n: LocaleDictionary;
    prefetch?: PrefetchData;
}
export const FullCollection: FunctionComponent<FullCollectionProps> = ({ slice, store, locale, prefetch, i18n }) => {
    const collection = prefetch?.collections?.[slice.primary.handle!];
    if (!collection) {
        console.warn(`Collection ${slice.primary.handle} not found in prefetch data`);
        return null;
    }

    return (
        <section className={styles.container} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <CollectionBlock
                    locale={locale}
                    data={collection as any}
                    store={store}
                    i18n={i18n}
                    limit={250}
                    showViewAll={false}
                />
            </PageContent>
        </section>
    );
};

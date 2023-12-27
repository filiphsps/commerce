import 'server-only';

import type { Shop } from '@/api/shop';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import type { CollectionSliceFull } from '@/prismic/types';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Suspense } from 'react';
import styles from './collection.module.scss';

type Slice = {
    slice_type: 'collection';
    slice_label: null;
    id?: string | undefined;
} & CollectionSliceFull;

type FullCollectionProps = {
    slice: Slice;
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
};
const FullCollection = ({
    slice: {
        primary: { handle },
        ...slice
    },
    shop,
    locale,
    i18n
}: FullCollectionProps) => {
    return (
        <PageContent
            as="section"
            className={`${styles.container} ${styles.full}`}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <Suspense fallback={<CollectionBlock.skeleton />}>
                <CollectionBlock
                    className={styles['full-collection']}
                    shop={shop}
                    locale={locale}
                    handle={handle as string}
                    limit={250}
                    showViewAll={false}
                />
            </Suspense>
        </PageContent>
    );
};

FullCollection.skeleton = ({ slice }: { slice?: Slice }) => {
    if (!slice || !slice.primary) return null;

    return (
        <PageContent
            as="section"
            className={`${styles.container} ${styles.full}`}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            data-skeleton
        >
            <CollectionBlock.skeleton />
        </PageContent>
    );
};

FullCollection.displayName = 'Nordcom.Slices.Collection.Full';
export default FullCollection;

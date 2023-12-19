import 'server-only';

import type { Shop } from '@/api/shop';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import type { CollectionSliceFull } from '@/prismic/types';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Suspense, type FunctionComponent } from 'react';
import styles from './collection.module.scss';

interface FullCollectionProps {
    slice: CollectionSliceFull & {
        slice_type: string;
    };
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
}
export const FullCollection: FunctionComponent<FullCollectionProps> = ({
    slice: {
        primary: { handle },
        ...slice
    },
    shop,
    locale,
    i18n
}) => {
    return (
        <PageContent
            className={`${styles.container} ${styles.full}`}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <Suspense fallback={<CollectionBlock.skeleton />}>
                <CollectionBlock
                    className={styles['full-collection']}
                    shop={shop}
                    locale={locale}
                    i18n={i18n}
                    handle={handle as string}
                    limit={250}
                    showViewAll={false}
                />
            </Suspense>
        </PageContent>
    );
};

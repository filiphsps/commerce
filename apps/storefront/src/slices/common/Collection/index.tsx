import 'server-only';

import styles from './collection.module.scss';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import CollectionContainer from '@/slices/common/Collection/collection';

import CollectionBlock from '@/components/products/collection-block';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `Collection`.
 */
export type CollectionProps = SliceComponentProps<
    Content.CollectionSlice,
    {
        shop: OnlineShop;
        locale: Locale;
        i18n: LocaleDictionary;
    }
>;

/**
 * Component for "Collection" Slices.
 */
const CollectionSlice = async ({ slice, index, context: { shop, locale } }: CollectionProps) => {
    // TODO: Remove this once we know there's no legacy data.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (slice.variation !== 'default') {
        console.warn(new Error(`500: Invalid variant: "${slice.variation}"`));
        return null;
    }

    const handle = slice.primary.handle as string;
    const fullWidth = slice.primary.display === 'full-width';
    const horizontal = slice.primary.direction === 'horizontal';
    const showViewAll = slice.primary.show_view_all_card;

    return (
        <CollectionContainer slice={slice} className={cn('w-full', fullWidth && styles.full)}>
            <Suspense fallback={<CollectionBlock.skeleton isHorizontal={horizontal} />}>
                <CollectionBlock
                    shop={shop}
                    locale={locale}
                    handle={handle}
                    isHorizontal={horizontal}
                    limit={slice.primary.limit || 16}
                    showViewAll={showViewAll}
                    priority={index < 3}
                />
            </Suspense>
        </CollectionContainer>
    );
};

CollectionSlice.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice) return null;

    return <CollectionContainer.skeleton slice={slice} />;
};

CollectionSlice.displayName = 'Nordcom.Slices.Collection';
export default CollectionSlice;

import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidSliceVariationError } from '@nordcom/commerce-errors';

import CollectionContainer from '@/slices/common/Collection/collection';
import { cn } from '@/utils/tailwind';

import CollectionBlock from '@/components/products/collection-block';

import type { Locale, LocaleDictionary } from '@/utils/locale';
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
    if ((slice.variation as string) !== 'default') {
        throw new InvalidSliceVariationError(slice.variation);
    }

    const handle = slice.primary.handle as string;
    const fullWidth = slice.primary.display === 'full-width';
    const horizontal = slice.primary.direction === 'horizontal';
    const showViewAll = slice.primary.show_view_all_card;

    return (
        <CollectionContainer slice={slice} className={cn('w-full', fullWidth && '')}>
            <Suspense fallback={<CollectionBlock.skeleton isHorizontal={horizontal} />}>
                <CollectionBlock
                    shop={shop}
                    locale={locale}
                    handle={handle}
                    isHorizontal={horizontal}
                    limit={slice.primary.limit || 16}
                    showViewAll={showViewAll}
                    priority={index < 3}
                    className={cn(
                        fullWidth &&
                            horizontal &&
                            'max-w-screen -mx-3 w-[calc(100%+1.23rem)] px-3 md:mx-0 md:w-full md:px-0'
                    )}
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

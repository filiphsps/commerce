import 'server-only';

import type { Shop } from '@/api/shop';
import CollectionBlock from '@/components/products/collection-block';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import { Suspense } from 'react';
import FullCollection from './FullCollection';
import CollectionContainer from './collection';

/**
 * Props for `Collection`.
 */
export type CollectionProps = SliceComponentProps<
    Content.CollectionSlice,
    {
        shop: Shop;
        locale: Locale;
        i18n: LocaleDictionary;
    }
>;

/**
 * Component for "Collection" Slices.
 */
const CollectionSlice = async ({ slice, index, context: { shop, locale, i18n } }: CollectionProps) => {
    switch (slice.variation) {
        case 'default': {
            const handle = slice.primary.handle as string;
            const horizontal = slice.primary.direction === 'horizontal';

            return (
                <Suspense
                    key={`${shop.id}.collection.${handle}.container`}
                    fallback={<CollectionSlice.skeleton slice={slice} />}
                >
                    <CollectionContainer slice={slice}>
                        <Suspense
                            key={`${shop.id}.collection.${handle}`}
                            fallback={<CollectionBlock.skeleton isHorizontal={horizontal} />}
                        >
                            <CollectionBlock
                                shop={shop}
                                locale={locale}
                                handle={handle}
                                isHorizontal={horizontal}
                                limit={slice.primary.limit || 16}
                                showViewAll={true}
                                priority={index < 3}
                            />
                        </Suspense>
                    </CollectionContainer>
                </Suspense>
            );
        }
        case 'full': {
            return <FullCollection slice={slice} shop={shop} locale={locale} i18n={i18n} />;
        }
        default: {
            throw new Error('500: Invalid variant');
        }
    }
};

CollectionSlice.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice || slice.variation === 'full') return null; // TODO: Skeleton for full variant.

    return <CollectionContainer.skeleton slice={slice} />;
};

CollectionSlice.displayName = 'Nordcom.Slices.Collection';
export default CollectionSlice;

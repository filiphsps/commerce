import 'server-only';

import CollectionBlock from '@/components/products/collection-block';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import { Suspense } from 'react';
import FullCollection from './FullCollection';
import CollectionContainer from './collection';

/**
 * Props for `Collection`.
 */
export type CollectionProps = SliceComponentProps<Content.CollectionSlice, any>;

/**
 * Component for "Collection" Slices.
 */
const CollectionSlice = async ({ slice, index, context: { shop, locale, i18n } }: CollectionProps) => {
    switch (slice.variation) {
        case 'default': {
            return (
                <Suspense fallback={<CollectionSlice.skeleton slice={slice} />}>
                    <CollectionContainer slice={slice}>
                        <Suspense fallback={<CollectionBlock.skeleton />}>
                            <CollectionBlock
                                shop={shop}
                                locale={locale}
                                handle={slice.primary.handle as string}
                                isHorizontal={slice.primary.direction === 'horizontal'}
                                limit={slice.primary.limit || 16}
                                showViewAll={true}
                                i18n={i18n}
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

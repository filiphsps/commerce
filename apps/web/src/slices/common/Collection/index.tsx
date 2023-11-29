import type { Content } from '@prismicio/client';

import { CollectionBlock, CollectionBlockSkeleton } from '@/components/products/collection-block';
import type { SliceComponentProps } from '@prismicio/react';
import { Suspense } from 'react';
import { FullCollection } from './FullCollection';
import { CollectionContainer } from './collection';

/**
 * Props for `Collection`.
 */
export type CollectionProps = SliceComponentProps<Content.CollectionSlice, any>;

/**
 * Component for "Collection" Slices.
 */
const Collection = ({ slice, index, context }: CollectionProps): JSX.Element => {
    switch (slice.variation) {
        case 'default': {
            return (
                <CollectionContainer
                    slice={slice}
                    prefetch={context.prefetch}
                    store={context.store}
                    locale={context.locale}
                    i18n={context.i18n}
                >
                    <Suspense
                        fallback={<CollectionBlockSkeleton isHorizontal={slice.primary.direction === 'horizontal'} />}
                    >
                        <CollectionBlock
                            isHorizontal={slice.primary.direction === 'horizontal'}
                            limit={slice.primary.limit || 16}
                            data={context?.prefetch?.collections?.[slice.primary.handle!]}
                            showViewAll={true}
                            store={context?.store}
                            locale={context.locale}
                            i18n={context.i18n}
                            priority={index < 3}
                        />
                    </Suspense>
                </CollectionContainer>
            );
        }
        case 'full': {
            return (
                <FullCollection
                    slice={slice}
                    prefetch={context.prefetch}
                    store={context.store}
                    locale={context.locale}
                    i18n={context.i18n}
                />
            );
        }
        default: {
            throw new Error('500: Invalid variant');
        }
    }
};

export default Collection;

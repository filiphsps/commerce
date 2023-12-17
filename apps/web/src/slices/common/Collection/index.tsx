import CollectionBlock from '@/components/products/collection-block';
import { deepEqual } from '@/utils/deep-equal';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import { memo } from 'react';
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
                    locale={context.locale}
                    i18n={context.i18n}
                >
                    <CollectionBlock
                        isHorizontal={slice.primary.direction === 'horizontal'}
                        limit={slice.primary.limit || 16}
                        data={context?.prefetch?.collections?.[slice.primary.handle!]}
                        showViewAll={true}
                        i18n={context.i18n}
                        priority={index < 3}
                    />
                </CollectionContainer>
            );
        }
        case 'full': {
            return (
                <FullCollection slice={slice} prefetch={context.prefetch} locale={context.locale} i18n={context.i18n} />
            );
        }
        default: {
            throw new Error('500: Invalid variant');
        }
    }
};

export default memo(Collection, deepEqual);

import type { CollectionSliceFull } from '@/prismic/types';
import type { FunctionComponent } from 'react';
import type { StoreModel } from '@/models/StoreModel';
import dynamic from 'next/dynamic';
import { styled } from '@linaria/react';

const PageContent = dynamic(() => import('@/components/PageContent'));
const VerticalCollection = dynamic(() =>
    import('@/components/products/VerticalCollection').then((c) => c.VerticalCollection)
);

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

interface FullCollectionProps {
    slice: {
        slice_type: 'collection';
        slice_label: null;
        id?: string | undefined;
    } & CollectionSliceFull;
    store: StoreModel;
    prefetch?: any;
}
export const FullCollection: FunctionComponent<FullCollectionProps> = ({ slice, store, prefetch }) => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <VerticalCollection
                    handle={slice.primary.handle!}
                    data={prefetch?.collections?.[slice.primary.handle!]}
                    store={store}
                />
            </PageContent>
        </Container>
    );
};

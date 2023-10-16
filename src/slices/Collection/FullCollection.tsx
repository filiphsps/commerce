import type { CollectionSliceFull } from 'prismicio-types';
import type { FunctionComponent } from 'react';
import PageContent from '@/components/PageContent';
import type { StoreModel } from 'src/models/StoreModel';
import { VerticalCollection } from '@/components/products/VerticalCollection';
import styled from 'styled-components';

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
export const FullCollection: FunctionComponent<FullCollectionProps> = ({
    slice,
    store,
    prefetch
}) => {
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

import type { CollectionSliceFull } from '@/prismic/types';
import type { FunctionComponent } from 'react';
import type { LocaleDictionary } from '@/utils/Locale';
import type { StoreModel } from '@/models/StoreModel';
import dynamic from 'next/dynamic';
import styled from 'styled-components';

const PageContent = dynamic(() => import('@/components/PageContent'));
const VerticalCollection = dynamic(() =>
    import('@/components/products/VerticalCollection').then((c) => c.VerticalCollection)
);

const Container = styled.section`
    width: 100%;
    padding: 0;
    margin: 0;
`;

interface FullCollectionProps {
    slice: {
        slice_type: 'collection';
        slice_label: null;
        id?: string | undefined;
    } & CollectionSliceFull;
    store: StoreModel;
    prefetch?: any;
    i18n: LocaleDictionary;
}
export const FullCollection: FunctionComponent<FullCollectionProps> = ({ slice, store, prefetch, i18n }) => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <VerticalCollection
                    handle={slice.primary.handle!}
                    data={prefetch?.collections?.[slice.primary.handle!]}
                    store={store}
                    i18n={i18n}
                />
            </PageContent>
        </Container>
    );
};

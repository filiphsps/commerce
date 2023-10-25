'use client';

import PageContent from '@/components/PageContent';
import { VerticalCollection } from '@/components/products/VerticalCollection';
import type { StoreModel } from '@/models/StoreModel';
import type { CollectionSliceFull } from '@/prismic/types';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';

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
    locale: Locale;
    prefetch?: any;
    i18n: LocaleDictionary;
}
export const FullCollection: FunctionComponent<FullCollectionProps> = ({ slice, store, locale, prefetch, i18n }) => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <VerticalCollection
                    handle={slice.primary.handle!}
                    locale={locale}
                    data={prefetch?.collections?.[slice.primary.handle!]}
                    store={store}
                    i18n={i18n}
                />
            </PageContent>
        </Container>
    );
};

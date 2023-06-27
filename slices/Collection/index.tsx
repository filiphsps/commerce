import CollectionBlock from '../../src/components/CollectionBlock';
import { Content } from '@prismicio/client';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import styled from 'styled-components';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

/**
 * Props for `Collection`.
 */
export type CollectionProps = SliceComponentProps<Content.CollectionSlice, any>;

/**
 * Component for "Collection" Slices.
 */
const Collection = ({ slice, context }: CollectionProps): JSX.Element => {
    return (
        <Container>
            <PageContent>
                <CollectionBlock
                    handle={slice.primary.handle!}
                    isHorizontal={slice.primary.direction === 'horizontal'}
                    limit={slice.primary.limit || 16}
                    hideTitle={slice.primary.hide_title}
                    plainTitle
                    data={context.prefetch?.collections?.[slice.primary.handle!]}
                    store={context.store}
                />
            </PageContent>
        </Container>
    );
};

export default Collection;

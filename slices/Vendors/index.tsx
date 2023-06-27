import { Content } from '@prismicio/client';
import ContentBlock from '../../src/components/ContentBlock';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import VendorsComponent from '../../src/components/Vendors';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: 1rem;
`;

/**
 * Props for `Vendors`.
 */
export type VendorsProps = SliceComponentProps<Content.VendorsSlice>;

/**
 * Component for "Vendors" Slices.
 */
const Vendors = ({}: VendorsProps): JSX.Element => {
    return (
        <Container>
            <ContentBlock>
                <PageContent>
                    <VendorsComponent />
                </PageContent>
            </ContentBlock>
        </Container>
    );
};

export default Vendors;

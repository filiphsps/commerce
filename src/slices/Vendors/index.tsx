'use client';

import { Content } from '@prismicio/client';
import PageContent from '@/components/PageContent';
import type { SliceComponentProps } from '@prismicio/react';
import VendorsComponent from '@/components/Vendors';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer);
`;

/**
 * Props for `Vendors`.
 */
export type VendorsProps = SliceComponentProps<Content.VendorsSlice>;

/**
 * Component for "Vendors" Slices.
 */
const Vendors = ({ slice, context }: VendorsProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <VendorsComponent data={(context as any)?.prefetch?.vendors} />
            </PageContent>
        </Container>
    );
};

export default Vendors;

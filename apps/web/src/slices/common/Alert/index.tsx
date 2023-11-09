'use client';

import type { SliceComponentProps } from '@prismicio/react';
import { PrismicRichText } from '@prismicio/react';

import { Alert as AlertComponent } from '@/components/Alert';
import type { Content } from '@prismicio/client';
import dynamic from 'next/dynamic';
import styled from 'styled-components';

const PageContent = dynamic(() => import('@/components/PageContent'));

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer);
`;

/**
 * Props for `Alert`.
 */
export type AlertProps = SliceComponentProps<Content.AlertSlice>;

/**
 * Component for "Alert" Slices.
 */
const Alert = ({ slice }: AlertProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <AlertComponent severity={slice.primary.severity}>
                    <PrismicRichText field={slice.primary.content} />
                </AlertComponent>
            </PageContent>
        </Container>
    );
};

export default Alert;

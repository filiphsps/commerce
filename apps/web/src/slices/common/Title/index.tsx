'use client';

import { PrismicText } from '@/components/typography/prismic-text';
import { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer);
`;

const Content = styled.div<{ $alignment: 'left' | 'center' | 'right' }>`
    display: flex;
    flex-direction: column;
    align-items: ${({ $alignment }) =>
        ($alignment === 'left' && 'start') ||
        ($alignment === 'center' && 'center') ||
        ($alignment === 'right' && 'end')};

    font-size: 3.25rem;
    line-height: 3.5rem;
    text-align: ${({ $alignment }) => $alignment};

    @media (min-width: 950px) {
        font-size: 3.75rem;
        line-height: 4rem;
    }
`;

/**
 * Props for `Title`.
 */
export type TitleProps = SliceComponentProps<Content.TitleSlice>;

/**
 * Component for "Title" Slices.
 */
const Title = ({ slice }: TitleProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <Content $alignment={slice.primary.alignment}>
                <PrismicText data={slice.primary.content} />
            </Content>
        </Container>
    );
};

export default Title;

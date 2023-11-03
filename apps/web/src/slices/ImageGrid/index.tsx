'use client';

import type { Content } from '@prismicio/client';
import Link from '@/components/link';
import PageContent from '@/components/PageContent';
import { PrismicNextImage } from '@prismicio/next';
import type { SliceComponentProps } from '@prismicio/react';
import styled from 'styled-components';

const Container = styled.section`
    //grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    width: 100%;
    padding: 0;
    margin: 0;
    flex-grow: 1;
`;
const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: unset;
    width: 100%;
    flex-grow: 1;
    gap: var(--block-spacer-large);

    @media (min-width: 550px) {
        grid-template-columns: 1fr 1fr;
    }
    @media (min-width: 950px) {
        grid-template-columns: 1fr 1fr 1fr;
    }
`;

const Title = styled.div`
    text-align: center;
    font-size: 2rem;
    line-height: 2rem;
    color: var(--color-bright);
`;
const TitleContainer = styled.div`
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    height: auto;
    padding: var(--block-padding) var(--block-padding-large);
    transition: 150ms ease-in-out outline-color;
    border-radius: var(--block-border-radius);
    border-top-right-radius: 0;
    border-top-left-radius: 0;
    background: var(--accent-primary);

    @media (max-width: 950px) {
        align-items: center;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover,
        &:active {
            outline-color: var(--accent-primary);
        }
    }
`;

const Banner = styled(PrismicNextImage)`
    width: 100%;
    height: auto;
    aspect-ratio: 21 / 6;
    object-fit: cover;
    object-position: 20% center;
    transition: 150ms ease-in-out;
`;

const Item = styled(Link)`
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
    border-radius: var(--block-border-radius);
    cursor: pointer;
    transition: 150ms ease-in-out;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--accent-secondary-light);

            img {
                transform: scale(1.1);
            }
        }
    }
`;

/**
 * Props for `ImageGrid`.
 */
export type ImageGridProps = SliceComponentProps<Content.ImageGridSlice>;

/**
 * Component for "ImageGrid" Slices.
 */
const ImageGrid = ({ slice }: ImageGridProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <Grid>
                    {slice.items.map(({ href, title, image }) => (
                        <Item key={href!} href={href! || ''} title={title!}>
                            <Banner field={image} width={300} height={300} sizes="(max-width: 950px) 250px, 25vw" />
                            <TitleContainer>
                                <Title>{title}</Title>
                            </TitleContainer>
                        </Item>
                    ))}
                </Grid>
            </PageContent>
        </Container>
    );
};

export default ImageGrid;

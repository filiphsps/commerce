'use client';

import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { deepEqual } from '@/utils/deep-equal';
import type { Content } from '@prismicio/client';
import { PrismicNextImage } from '@prismicio/next';
import type { SliceComponentProps } from '@prismicio/react';
import { memo } from 'react';
import styled from 'styled-components';

const Container = styled.section`
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
    font-weight: 600;
    line-height: 2rem;
    color: var(--accent-secondary-text);
`;
const TitleContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: auto;
    padding: var(--block-padding) var(--block-padding-large);
    transition: 150ms ease-in-out outline-color;
    border-radius: var(--block-border-radius);
    border-top-right-radius: 0;
    border-top-left-radius: 0;
    background: var(--accent-secondary-light);

    @media (max-width: 950px) {
        align-items: center;
    }

    &:is(:hover, :active) {
        outline-color: var(--accent-primary);
    }
`;

const Item = styled(Link)`
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
    border-radius: var(--block-border-radius);
    cursor: pointer;
    outline-color: var(--accent-secondary-light);
    outline-width: 0;

    &:is(:hover, :active) {
        background: var(--accent-primary);
        outline: var(--block-border-width) solid var(--accent-primary);
    }
`;

/**
 * Props for `ImageGrid`.
 */
export type ImageGridProps = SliceComponentProps<Content.ImageGridSlice>;

/**
 * Component for "ImageGrid" Slices.
 */
const ImageGrid = ({ slice, index }: ImageGridProps): JSX.Element => {
    return (
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <Grid>
                    {slice.items.map(({ href, title, image }) => (
                        <Item key={href!} href={href! || ''} title={title!}>
                            <PrismicNextImage
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    aspectRatio: '21 / 6',
                                    objectFit: 'cover',
                                    objectPosition: '20% center',
                                    transition: '150ms ease-in-out'
                                }}
                                field={image}
                                width={300}
                                height={200}
                                sizes="(max-width: 950px) 250px, 25vw"
                                fallbackAlt=""
                                // If we're positioned high up in the page, we want to load the image
                                // immediately. Otherwise, we can wait until the browser decides to.
                                priority={index < 3}
                            />
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

export default memo(ImageGrid, deepEqual);

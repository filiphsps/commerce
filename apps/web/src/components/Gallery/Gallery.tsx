'use client';

import { useEffect, useState } from 'react';

import type { ImageConnection } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/image';
import type { HTMLProps } from 'react';
import styled from 'styled-components';

const Previews = styled.div`
    position: relative;
    grid-area: previews;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: var(--block-spacer);
    width: 100%;
    height: 100%;

    @media (min-width: 950px) {
        position: relative;
        flex-direction: row;
        height: fit-content;
    }
`;
const Preview = styled.div`
    width: 6rem;
    height: 6rem;
    padding: var(--block-padding-small);
    background: var(--color-block);
    border-radius: var(--block-border-radius);
    cursor: pointer;
    transition: 150ms ease-in-out;
    user-select: none;
    opacity: 0.75;

    &:is(.Selected, :hover, :active, :focus):not(:disabled) {
        border-color: var(--accent-primary);
        opacity: 1;
    }

    img {
        width: 100%;
        height: 100%;
    }

    @media (min-width: 950px) {
        width: 12rem;
        height: 12rem;
        padding: var(--block-padding);
        border: var(--block-border-width) solid var(--color-block);
        opacity: 1;

        img {
            width: 100%;
            height: 100%;
        }
    }
`;

const Primary = styled.div`
    position: relative;
    grid-area: primary;
    padding: var(--block-padding);
    border-radius: var(--block-border-radius-large);
    background: var(--color-block);
    max-height: 100%;

    @media (min-width: 950px) {
        padding: calc(var(--block-padding-large) * 2);
        max-height: unset;
    }
`;

const ImageWrapper = styled.div`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 1;
    height: 100%;
    width: 100%;
`;

const Container = styled.div`
    position: sticky;
    top: 8rem;
    display: grid;
    grid-template-areas: 'primary previews';
    grid-template-columns: 1fr auto;
    grid-template-rows: 100%;
    gap: var(--block-spacer);
    width: 100%;
    height: 30vh;
    max-height: 100%;
    transition: 150ms ease-in-out;

    @media (min-width: 950px) {
        grid-template-areas: 'primary' 'previews';
        grid-template-columns: 1fr;
        grid-template-rows: 100% 1fr;
        height: 60vh;
        max-height: 100%;
    }

    img {
        flex-shrink: 1;
        width: 100%;
        object-fit: contain;
        object-position: center;
        --padding: var(--block-spacer);
        --calculated: calc(var(--padding) * 2 - var(--block-spacer) * 2);
        height: calc(30vh - var(--calculated));
        max-height: calc(100% - var(--calculated));
        padding: var(--padding);

        /* TODO: Do this properly. */
        mix-blend-mode: multiply;
        filter: contrast(1);

        @media (min-width: 950px) {
            height: 70vh;
            max-height: 100%;
            max-width: 48rem;
            padding: var(--block-padding-large);
        }
    }

    & > div:only-child {
        grid-column: 1 / -1;
    }
`;

type GalleryProps = {
    initialImageId?: string | null;
    images: ImageConnection | null;
} & HTMLProps<HTMLDivElement>;
const Gallery = ({ initialImageId, images, ...props }: GalleryProps) => {
    const [selected, setSelected] = useState(initialImageId || images?.edges[0].node.id);

    useEffect(() => {
        if (!initialImageId) return;
        else if (initialImageId == selected) return;

        setSelected(initialImageId);
    }, [initialImageId]);

    if (!images) return null;

    const image = images.edges.find((image) => image.node && image.node.id === selected)?.node || images.edges[0].node;
    return (
        <Container {...props}>
            <Primary>
                <ImageWrapper>
                    <Image
                        src={image.url || image.src || ''}
                        alt={image.altText || ''}
                        title={image.altText || undefined}
                        width={image.width || 0}
                        height={image.height || 0}
                        sizes="(max-width: 950px) 125px, 950px"
                        priority
                    />
                </ImageWrapper>
            </Primary>
            {(images?.edges?.length > 1 && (
                <Previews>
                    {images.edges.map(({ node: image }) => (
                        <Preview
                            key={image.id}
                            onClick={() => setSelected(image.id)}
                            className={image.id === selected ? 'Selected' : ''}
                        >
                            <ImageWrapper>
                                <Image
                                    src={image.url}
                                    alt={image.altText || ''}
                                    title={image.altText || undefined}
                                    width={125}
                                    height={125}
                                    sizes="(max-width: 950px) 50px, 250px"
                                    priority
                                />
                            </ImageWrapper>
                        </Preview>
                    ))}
                </Previews>
            )) ||
                null}
        </Container>
    );
};

export default Gallery;

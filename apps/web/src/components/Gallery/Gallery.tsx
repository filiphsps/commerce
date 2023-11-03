'use client';

import { useEffect, useState } from 'react';

import type { FunctionComponent } from 'react';
import Image from 'next/image';
import type { ImageConnection } from '@shopify/hydrogen-react/storefront-api-types';
import styled from 'styled-components';

const Previews = styled.div`
    position: relative;
    grid-area: previews;
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    gap: var(--block-spacer);

    @media (min-width: 950px) {
        display: flex;
        position: relative;
        inset: unset;
        //flex-direction: column;
        height: fit-content;
    }
`;
const Preview = styled.div`
    overflow: hidden;
    width: fit-content;
    height: 6rem;
    padding: var(--block-padding);
    background: var(--background-preview);
    border-radius: var(--block-border-radius);
    cursor: pointer;
    transition: 150ms ease-in-out;
    user-select: none;
    opacity: 0.5;

    @media (min-width: 950px) {
        width: 12rem;
        height: fit-content;
        border: var(--block-border-width) solid var(--background-preview);
        opacity: 1;
    }

    &.Selected,
    &:hover,
    &:active {
        border-color: var(--accent-primary);
        opacity: 1;
    }

    @media (max-width: 950px) {
        img {
            width: auto;
            object-fit: cover;
            height: 100%;
        }
    }
`;

const Primary = styled.div`
    position: relative;
    grid-area: primary;
    width: auto;
    height: fit-content;
    padding: calc(var(--block-padding-large) * 2);

    @media (max-width: 950px) {
        padding: 0;

        img {
            height: calc(35vh - calc(6rem + var(--block-spacer)));
            max-height: calc(100% - calc(6rem + var(--block-spacer)));
        }
    }

    @media (min-width: 950px) {
        width: 100%;
        height: 100%;
    }
`;

const ImageWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    flex-shrink: 1;
    max-height: 100%;
`;

const Container = styled.div`
    position: relative;
    display: grid;
    grid-template-areas: 'primary' 'previews';
    width: 100%;
    max-height: 100%;
    gap: var(--block-spacer);
    transition: 150ms ease-in-out;

    img {
        flex-shrink: 1;
        width: 100%;
        object-fit: contain;
        object-position: center;
        height: calc(30vh - calc(6rem + var(--block-spacer)));
        max-height: calc(100% - calc(6rem + var(--block-spacer)));

        @media (min-width: 950px) {
            height: unset;
            max-height: 70vh;
        }
    }

    & > div:only-child {
        grid-column: 1 / -1;
    }
`;

interface GalleryProps {
    selected: string | null;
    images: ImageConnection | null;
}
const Gallery: FunctionComponent<GalleryProps> = ({ selected: defaultImageIndex, images }) => {
    const [selected, setSelected] = useState(defaultImageIndex || images?.edges[0].node.id);

    useEffect(() => {
        if (!defaultImageIndex) return;
        else if (defaultImageIndex == selected) return;

        setSelected(defaultImageIndex);
    }, [defaultImageIndex]);

    if (!images) return null;

    const image = images.edges.find((image) => image.node && image.node.id === selected)?.node || images.edges[0].node;
    return (
        <Container>
            <Primary>
                <ImageWrapper>
                    <Image
                        src={image.url}
                        alt={image.altText || ''}
                        title={image.altText || undefined}
                        width={image.width || 0}
                        height={image.height || 0}
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
                                    sizes="(max-width: 950px) 75px, 250px"
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

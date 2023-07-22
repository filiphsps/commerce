import { FunctionComponent, useEffect, useState } from 'react';

import Image from 'next/image';
import { ImageConnection } from '@shopify/hydrogen-react/storefront-api-types';
import { ImageLoader } from '../../util/ImageLoader';
import styled from 'styled-components';

const Container = styled.div`
    position: relative;
    display: grid;
    grid-template-areas: 'primary' 'previews';
    width: 100%;
    height: 100%;
    gap: var(--block-spacer);
    transition: 250ms ease-in-out;

    @media (min-width: 950px) {
        overflow: unset;
        border-radius: none;
    }

    img {
        flex-shrink: 1;
        width: 100%;
        mix-blend-mode: multiply;
        object-fit: contain;
        object-position: center;
        max-height: 70vh;
    }

    & > div:only-child {
        grid-column: 1 / -1;
    }
`;

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
    background: var(--color-block);
    border-radius: var(--block-border-radius);
    cursor: pointer;
    transition: 250ms ease-in-out;
    user-select: none;
    opacity: 0.5;

    @media (min-width: 950px) {
        width: 12rem;
        height: fit-content;
        border: var(--block-border-width) solid var(--color-block);
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
    overflow: hidden;
    position: relative;
    grid-area: primary;
    width: auto;
    height: fit-content;
    padding: calc(var(--block-padding-large) * 2);
    background: var(--color-block);
    border-radius: var(--block-border-radius);

    @media (max-width: 950px) {
        img {
            max-height: 35vh;
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
    height: 100%;
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

    const image =
        images.edges.find((image) => image.node && image.node.id === selected)?.node ||
        images.edges[0].node;
    return (
        <Container
            style={
                (images?.edges?.length <= 1 && {
                    gridTemplateAreas: '"primary"'
                }) ||
                {}
            }
        >
            <Primary>
                <ImageWrapper>
                    <Image
                        src={image.url}
                        alt={image.altText || ''}
                        title={image.altText || undefined}
                        width={image.width || 0}
                        height={image.height || 0}
                        priority
                        loader={ImageLoader}
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
                                    loader={ImageLoader}
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

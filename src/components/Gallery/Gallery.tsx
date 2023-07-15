import { FunctionComponent, useEffect, useState } from 'react';

import Image from 'next/image';
import { ImageConnection } from '@shopify/hydrogen-react/storefront-api-types';
import { ImageLoader } from '../../util/ImageLoader';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-rows: 1fr auto;
    width: 100%;
    height: 100%;
    gap: var(--block-spacer);

    @media (max-width: 950px) {
        grid-template-rows: 1fr;
        grid-template-columns: 1fr auto;
    }

    &.Single {
        grid-template-rows: 1fr;
        grid-template-columns: 1fr;
    }
`;

const Previews = styled.div`
    position: relative;
    display: flex;
    flex-direction: row;
    gap: var(--block-spacer);
    width: 100%;
    height: 100%;

    @media (max-width: 950px) {
        flex-direction: column;
    }
`;
const Preview = styled.div`
    overflow: hidden;
    width: 12rem;
    height: 10rem;
    padding: 0.8rem;
    background: var(--color-block);
    border: 0.2rem solid var(--color-block);
    cursor: pointer;
    transition: 250ms ease-in-out;
    border-radius: var(--block-border-radius);
    user-select: none;

    &.Selected,
    &:hover,
    &:active {
        border-width: 0.2rem;
        border-color: var(--accent-primary);
    }

    @media (max-width: 950px) {
        padding: 0.15rem;
        width: 4.5rem;
        height: 4.5rem;
        border-width: 0px;

        img {
            object-fit: cover;
            object-position: center;
        }
    }
`;

const Primary = styled.div`
    overflow: hidden;
    width: 100%;
    height: 100%;
    padding: 2rem;
    background: var(--color-block);
    border-radius: var(--block-border-radius);
`;

const ImageWrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;

    img {
        mix-blend-mode: multiply;
        object-fit: contain;
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

    const image =
        images.edges.find((image) => image.node && image.node.id === selected)?.node ||
        images.edges[0].node;
    return (
        <Container className={(images.edges.length <= 1 && 'Single') || ''}>
            <Primary>
                <ImageWrapper>
                    <Image
                        src={image.url}
                        alt={image.altText || ''}
                        title={image.altText || undefined}
                        fill
                        priority
                        loader={ImageLoader}
                    />
                </ImageWrapper>
            </Primary>
            {images.edges.length > 1 ? (
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
                                    fill
                                    loader={ImageLoader}
                                />
                            </ImageWrapper>
                        </Preview>
                    ))}
                </Previews>
            ) : null}
        </Container>
    );
};

export default Gallery;

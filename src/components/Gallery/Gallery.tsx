import { FunctionComponent, useEffect, useState } from 'react';

import Image from 'next/legacy/image';
import { ImageConnection } from '@shopify/hydrogen-react/storefront-api-types';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-rows: 1fr auto;
    width: 100%;
    height: 100%;
    gap: 1rem;

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
    overflow-x: auto;
    display: flex;
    flex-direction: row;
    gap: 1rem;
    width: 100%;

    @media (max-width: 950px) {
        overflow-x: hidden;
        overflow-y: auto;
        flex-direction: column;
    }
`;
const Preview = styled.div`
    width: 12rem;
    height: 10rem;
    padding: 0.8rem;
    background: #efefef;
    border: 0.2rem solid #efefef;
    cursor: pointer;
    transition: 150ms ease-in-out;
    border-radius: var(--block-border-radius);
    user-select: none;

    &.Selected,
    &:hover,
    &:active {
        border-width: 0.2rem;
        border-color: var(--accent-primary);
    }

    @media (max-width: 950px) {
        overflow: hidden;
        padding: 0px;
        width: 3.5rem;
        height: 3.5rem;
        border-width: 0px;

        img {
            object-fit: cover;
            object-position: center;
        }
    }
`;

const Primary = styled.div`
    width: 100%;
    height: 100%;
    padding: 2rem;
    background: #efefef;
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
                        alt={image.altText || undefined}
                        title={image.altText || undefined}
                        layout="fill"
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
                                    alt={image.altText || undefined}
                                    title={image.altText || undefined}
                                    layout="fill"
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

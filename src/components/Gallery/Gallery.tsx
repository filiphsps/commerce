import { FunctionComponent, useState } from 'react';

import Image from 'next/image';
import { ProductImageModel } from '../../models/ProductModel';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-rows: 1fr auto;
    width: 100%;
    height: 100%;
`;

const Previews = styled.div`
    display: flex;
    flex-direction: row;
    gap: 1rem;
    margin-top: 1rem;
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
        border-color: var(--accent-primary);
    }

    @media (max-width: 950px) {
        width: 8rem;
        height: 8rem;
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
    selected: number;
    images: ProductImageModel[];
}
const Gallery: FunctionComponent<GalleryProps> = ({
    selected: defaultImageIndex,
    images
}) => {
    const [selected, setSelected] = useState(defaultImageIndex);

    const image = images[selected];
    return (
        <Container>
            <Primary>
                <ImageWrapper>
                    <Image
                        src={image.src}
                        alt={image.alt}
                        title={image.alt}
                        layout="fill"
                    />
                </ImageWrapper>
            </Primary>
            {images.length > 1 ? (
                <Previews>
                    {images.map((image, index) => (
                        <Preview
                            key={image.id}
                            onClick={() => setSelected(index)}
                            className={index === selected ? 'Selected' : ''}
                        >
                            <ImageWrapper>
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    title={image.alt}
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

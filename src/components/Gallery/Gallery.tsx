import styled, { css } from 'styled-components';
import { useEffect, useState } from 'react';

import type { FunctionComponent } from 'react';
import Image from 'next/image';
import type { ImageConnection } from '@shopify/hydrogen-react/storefront-api-types';

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
    transition: 250ms ease-in-out;
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
    overflow: hidden;
    position: relative;
    grid-area: primary;
    width: auto;
    height: fit-content;
    padding: calc(var(--block-padding-large) * 2);
    background: var(--background);
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

const Container = styled.div<{ $noBlend?: boolean }>`
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
        ${({ $noBlend }) =>
            !$noBlend &&
            css`
                mix-blend-mode: multiply;
            `}

        object-fit: contain;
        object-position: center;
        max-height: 35vh;

        @media (min-width: 950px) {
            max-height: 70vh;
        }
    }

    & > div:only-child {
        grid-column: 1 / -1;
    }

    &.Pastel {
        ${Previews} {
            justify-content: center;

            ${Preview} {
                //width: 100%;
            }
        }

        ${Primary} {
            @keyframes float {
                0% {
                    transform: translateY(-0.5rem) scale(1.05, 1);
                }
                50% {
                    transform: translateY(0.5rem) scale(1, 1.05);
                }
                100% {
                    transform: translateY(-0.5rem) scale(1.05, 1);
                }
            }
            transform: translateY(0);
            animation: float 8s ease-in-out infinite;

            @media (min-width: 950px) {
                animation: none;
            }

            img {
                height: 35vh;

                @media (min-width: 950px) {
                    height: unset;
                }
            }
        }
    }
`;

interface GalleryProps {
    pastel?: boolean;
    background?: string;
    previewBackground?: string;
    selected: string | null;
    images: ImageConnection | null;
}
const Gallery: FunctionComponent<GalleryProps> = ({
    pastel,
    background,
    previewBackground,
    selected: defaultImageIndex,
    images
}) => {
    const [selected, setSelected] = useState(defaultImageIndex || images?.edges[0].node.id);

    useEffect(() => {
        if (!defaultImageIndex) return;
        else if (defaultImageIndex == selected) return;

        setSelected(defaultImageIndex);
    }, [defaultImageIndex]);

    if (!images) return null;

    const image = images.edges.find((image) => image.node && image.node.id === selected)?.node || images.edges[0].node;
    return (
        <Container
            className={(pastel && 'Pastel') || ''}
            $noBlend={!!background || undefined}
            style={
                {
                    ...((images?.edges?.length <= 1 && {
                        gridTemplateAreas: '"primary"'
                    }) ||
                        {}),
                    '--background': background || 'var(--color-block)',
                    '--background-preview': previewBackground || 'var(--color-block)'
                } as React.CSSProperties
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

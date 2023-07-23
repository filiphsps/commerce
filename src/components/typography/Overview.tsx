import React, { FunctionComponent } from 'react';
import styled, { css } from 'styled-components';

import ContentComponent from '../Content';
import Image from 'next/image';
import { ImageLoader } from '../../util/ImageLoader';

const Container = styled.div<{ layout?: 'left' | 'right' }>`
    display: grid;
    grid-template-areas: 'overview-banner' 'overview-content';
    height: 100%;
    border-radius: var(--block-border-radius);
    gap: var(--block-spacer-large);

    @media (min-width: 765px) {
        justify-content: stretch;
        align-items: stretch;
        grid-template-areas: 'overview-banner overview-content';
        grid-template-columns: minmax(32rem, 1fr) auto;

        ${({ layout }) =>
            layout === 'right' &&
            css`
                grid-template-areas: 'overview-content overview-banner';
                grid-template-columns: auto minmax(32rem, 1fr);
            `}
    }
`;

const ImageWrapper = styled.div`
    position: relative;
    height: 100%;
    width: 100%;

    img {
        height: 100%;
        width: 100%;
        object-fit: contain;
    }
`;
const ImageContainer = styled.div<{ fill?: boolean }>`
    grid-area: overview-banner;
    overflow: hidden;
    flex-basis: 40%;
    height: 100%;
    width: 100%;
    aspect-ratio: 4 / 3;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);

    ${({ fill }) =>
        fill &&
        css`
            padding: 0px;

            ${ImageWrapper} {
                padding: var(--block-padding-large);

                img {
                    object-fit: cover;
                }
            }
        `}
`;

const Content = styled(ContentComponent)`
    grid-area: overview-content;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: fit-content;
    width: 100%;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--color-block);

    @media (min-width: 950px) {
        padding: calc(var(--block-padding-large) * 2);
        height: 100%;
    }

    &.Plain {
        max-width: 72rem;
        height: auto;
        padding: 0px;
        background: none;

        a {
            color: var(--color-primary-text);
            border-color: var(--color-primary-text);

            &:hover {
                color: var(--accent-secondary-dark);
                border-color: var(--accent-secondary-dark);
            }
        }
    }
`;

interface OverviewProps {
    body?: React.ReactNode;
    image?: {
        alt?: string;
        url: string;
        dimensions: {
            height: number;
            width: number;
        };
    };
    imageStyle?: 'normal' | 'cover';
    layout?: 'left' | 'right';
    style?: React.CSSProperties;
}
export const Overview: FunctionComponent<OverviewProps> = ({
    body,
    image,
    imageStyle,
    layout,
    style
}) => {
    if (!image) return <Content className="Plain">{body}</Content>;

    return (
        <Container style={style} className="TextBlock Block" layout={layout}>
            <ImageContainer fill={imageStyle === 'cover' || undefined}>
                <ImageWrapper>
                    <Image
                        src={image?.url}
                        alt={image?.alt || 'Decorative image to content'}
                        fill
                        loader={ImageLoader}
                    />
                </ImageWrapper>
            </ImageContainer>
            <Content>{body}</Content>
        </Container>
    );
};

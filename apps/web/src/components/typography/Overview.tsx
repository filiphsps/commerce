'use client';

import styled, { css } from 'styled-components';

import styles from '@/components/informational/image-with-text.module.scss';
import { Content as ContentComponent } from '@/components/typography/content';
import { PrismicNextImage } from '@prismicio/next';
import type { FunctionComponent } from 'react';

const Container = styled.div<{ $layout?: 'left' | 'right' }>`
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: var(--block-border-radius);
    gap: var(--block-spacer-large);

    @media (min-width: 765px) {
        display: grid;
        justify-content: stretch;
        align-items: stretch;
        grid-template-areas: 'overview-banner overview-content';
        grid-template-columns: minmax(32rem, 1fr) auto;

        ${({ $layout }) =>
            $layout === 'right' &&
            css`
                grid-template-areas: 'overview-content overview-banner';
                grid-template-columns: auto minmax(32rem, 1fr);
            `}
    }
`;

const ImageWrapper = styled.div`
    width: 100%;

    img {
        display: block;
        height: 100%;
        width: 100%;
        object-fit: contain;
    }
`;
const ImageContainer = styled.div<{ $expand?: boolean }>`
    grid-area: overview-banner;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    flex-basis: 40%;
    height: 100%;
    width: 100%;
    padding: var(--block-padding-large);
    border-radius: var(--block-border-radius);
    background: var(--accent-primary);

    @media (min-width: 765px) {
        aspect-ratio: 4 / 3;
        padding: var(--block-padding-large);
    }

    ${({ $expand }) =>
        $expand &&
        css`
            padding: 0;

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

    &.plain {
        max-width: 72rem;
        height: auto;
        padding: 0;
        background: none;

        a {
            color: var(--color-primary-text);
            border-color: var(--color-primary-text);

            @media (hover: hover) and (pointer: fine) {
                &:hover {
                    color: var(--accent-secondary-dark);
                    border-color: var(--accent-secondary-dark);
                }
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
export const Overview: FunctionComponent<OverviewProps> = ({ body, image, imageStyle, layout, style }) => {
    if (!image) return <Content className="plain">{body}</Content>;

    return (
        <Container style={style} className={`${styles.container} TextBlock Block`} $layout={layout}>
            <ImageContainer $expand={imageStyle === 'cover'}>
                <ImageWrapper>
                    <PrismicNextImage
                        field={image as any}
                        sizes="(max-width: 1150px) 250px, 250px"
                        fallbackAlt=""
                        decoding="async"
                    />
                </ImageWrapper>
            </ImageContainer>
            <Content className={styles.content}>{body}</Content>
        </Container>
    );
};

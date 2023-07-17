import React, { FunctionComponent, memo } from 'react';

import ContentComponent from '../Content';
import Image from 'next/legacy/image';
import { ImageLoader } from '../../util/ImageLoader';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--block-spacer);

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
    }

    &.Block {
        color: var(--color-dark);

        h1 {
            padding-bottom: 1rem;
        }
    }
`;
const ImageContainer = styled.div`
    overflow: hidden;
    height: 100%;
    width: 100%;
    max-width: 46rem;
    background: var(--accent-primary);
    border-radius: var(--block-border-radius);
`;
const ImageWrapper = styled.div`
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    padding: var(--block-padding-large);

    img {
        object-fit: contain;
    }

    @media (max-width: 950px) {
        height: 18rem;
    }
`;
const Content = styled(ContentComponent)`
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding: var(--block-padding-large);
    background: var(--color-block);
    border-radius: var(--block-border-radius);

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

interface TextBlockProps {
    body?: string;
    image?: {
        alt?: string;
        url: string;
        dimensions: {
            height: number;
            width: number;
        };
    };
}
const TextBlock: FunctionComponent<TextBlockProps> = ({ body, image }) => {
    if (!image)
        return (
            <Content
                className="Plain"
                dangerouslySetInnerHTML={{
                    __html: body || ''
                }}
            />
        );

    return (
        <Container className="TextBlock Block">
            <ImageContainer>
                <ImageWrapper>
                    <Image
                        src={image?.url}
                        alt={image?.alt || 'Decorative image to content'}
                        width={image?.dimensions?.width || 0}
                        height={image?.dimensions?.height || 0}
                        layout="intrinsic"
                        loader={ImageLoader}
                    />
                </ImageWrapper>
            </ImageContainer>
            <Content
                dangerouslySetInnerHTML={{
                    __html: body || ''
                }}
            />
        </Container>
    );
};

export default memo(TextBlock);

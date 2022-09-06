import React, { FunctionComponent, memo } from 'react';

import Image from 'next/image';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;

    @media (max-width: 950px) {
        grid-template-columns: 1fr;
    }
`;
const ImageContainer = styled.div`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    max-width: 46rem;
    padding: 4rem;
    background: var(--accent-primary);

    img {
        object-fit: contain;
    }

    @media (max-width: 950px) {
        max-height: 18rem;
        max-width: 100%;
    }
`;
const Content = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    margin-bottom: 1rem;
    background: #efefef;

    &.Plain {
        max-width: 72rem;
        padding: 0px;
        background: none;
    }

    a {
        color: var(--accent-primary);

        &:hover {
            color: var(--accent-primary-light);
            text-decoration: underline;
        }
    }

    p {
        margin-bottom: 1.5rem;
        font-size: 1.75rem;
        line-height: 2.25rem;
        color: #404756;

        em,
        i {
            font-weight: 700;
        }
    }

    h2 {
        margin-bottom: 0.5rem;
        font-size: 2rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05rem;
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
    // FIXME: Add support for TextBlock without image.
    if (!image)
        return (
            <Content
                className="Plain"
                dangerouslySetInnerHTML={{
                    __html: body
                }}
            />
        );

    return (
        <Container className="TextBlock">
            <ImageContainer>
                <Image
                    src={image?.url}
                    alt={image?.alt}
                    width={image?.dimensions?.width || 0}
                    height={image?.dimensions?.height || 0}
                    layout="intrinsic"
                />
            </ImageContainer>
            <Content
                dangerouslySetInnerHTML={{
                    __html: body
                }}
            />
        </Container>
    );
};

export default memo(TextBlock);

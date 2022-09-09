import React, { FunctionComponent, memo } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import PageContent from '../../../PageContent';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: 1rem;
`;
const Item = styled.div`
    overflow: hidden;
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 2rem;
    max-height: 18rem;

    a {
        display: block;
        height: 100%;
        width: 100%;
    }

    img {
        object-fit: cover;
        object-position: center center;
    }
`;

const Title = styled.div`
    text-align: center;
    text-transform: uppercase;
    font-size: 2rem;
    color: var(--color-text-primary);
`;
const TitleContainer = styled.div`
    position: absolute;
    bottom: 0px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    padding: 2rem;
    height: 100%;
    width: 100%;
    background: linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.45) 0%,
        rgba(0, 0, 0, 0) 100%
    );

    transition: 250ms ease-in-out;

    &:hover,
    &:active {
        border: 0.2rem solid var(--accent-primary);
        padding-bottom: 2.25rem;
    }
`;

interface ImageLinksProps {
    data: {
        primary: {};
        items: Array<{
            image?: {
                dimensions: {
                    width: number;
                    height: number;
                };
                alt: string;
                url: string;
            };
            title: string;
            handle: string;
        }>;
    };
}
const ImageLinks: FunctionComponent<ImageLinksProps> = ({ data }) => {
    const { items } = data;
    return (
        <div className="Slice Slice-ImageLinks">
            <PageContent>
                <Container>
                    {items.map(({ handle, title, image }) => (
                        <Item key={handle} title={title}>
                            <Link href={handle}>
                                <a>
                                    <Image
                                        src={image.url}
                                        alt={image.alt || title}
                                        width={image.dimensions.width}
                                        height={image.dimensions.height}
                                    />

                                    {title ? (
                                        <TitleContainer>
                                            <Title>{title}</Title>
                                        </TitleContainer>
                                    ) : null}
                                </a>
                            </Link>
                        </Item>
                    ))}
                </Container>
            </PageContent>
        </div>
    );
};

export default memo(ImageLinks);

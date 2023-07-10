import { Content } from '@prismicio/client';
import Image from 'next/legacy/image';
import Link from 'next/link';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: 1rem;
    width: 100%;
    padding: 0px;
    margin: 0px;
`;
const Grid = styled.div`
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
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 10px -5px rgba(0, 0, 0, 0.25);

    @media (max-width: 950px) {
        max-height: 6rem;
    }

    a {
        display: block;
        height: 100%;
        width: 100%;

        img {
            object-fit: cover;
            object-position: center center;
            transition: 150ms ease-in-out;
        }

        &:active,
        &:focus,
        &:hover {
            img {
                transform: scale(1.15);
            }
        }
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
    padding: 2rem 2rem 1.8rem 2rem;
    height: 100%;
    width: 100%;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0) 100%);
    transition: 150ms ease-in-out border;
    border-radius: var(--block-border-radius);
    border-color: var(--accent-primary);

    &:hover,
    &:active {
        border: 0.5rem solid var(--accent-primary);
    }
`;

/**
 * Props for `ImageGrid`.
 */
export type ImageGridProps = SliceComponentProps<Content.ImageGridSlice>;

/**
 * Component for "ImageGrid" Slices.
 */
const ImageGrid = ({ slice }: ImageGridProps): JSX.Element => {
    return (
        <Container>
            <PageContent>
                <Grid>
                    {slice.items.map(({ href, title, image }) => (
                        <Item key={href!} title={title!}>
                            <Link href={href!}>
                                <Image
                                    src={image?.url || ''}
                                    alt={image?.alt || title || ''}
                                    width={image.dimensions?.width!}
                                    height={image.dimensions?.height!}
                                />

                                {title ? (
                                    <TitleContainer>
                                        <Title>{title}</Title>
                                    </TitleContainer>
                                ) : null}
                            </Link>
                        </Item>
                    ))}
                </Grid>
            </PageContent>
        </Container>
    );
};

export default ImageGrid;

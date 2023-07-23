import { Content } from '@prismicio/client';
import Image from 'next/image';
import { ImageLoader } from '../../src/util/ImageLoader';
import Link from 'next/link';
import PageContent from '@/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import styled from 'styled-components';

const Container = styled.section`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer);
    width: 100%;
    padding: 0px;
    margin: 0px;
    user-select: none;
`;
const Grid = styled.div`
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: var(--block-spacer);
`;
const Item = styled.div`
    overflow: hidden;
    position: relative;
    width: 100% !important;
    height: 100% !important;
    min-height: 2rem;
    border-radius: var(--block-border-radius);

    @media (max-width: 950px) {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        max-height: 8rem;
    }

    &:hover {
        box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);
    }

    a {
        display: block;
        height: 100%;
        width: 100%;
        min-height: 18rem;

        img {
            object-fit: cover;
            object-position: center center;
            transition: 250ms ease-in-out;
        }

        &:active,
        &:focus,
        &:hover {
            img {
                transform: scale(1.05);
            }
        }
    }
`;

const Title = styled.div`
    text-align: center;
    text-transform: uppercase;
    font-size: 2rem;
    color: var(--color-bright);
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
    background: linear-gradient(0deg, var(--color-block-shadow) 0%, transparent 100%);
    transition: 250ms ease-in-out outline-color;
    border-radius: var(--block-border-radius);
    outline: var(--block-border-width) solid transparent;
    outline-offset: calc(var(--block-border-width) * -1);
    text-shadow: var(--color-dark) 0px 0px 1.25rem;

    @media (max-width: 950px) {
        align-items: center;
    }

    &:hover,
    &:active {
        outline-color: var(--accent-primary);
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
        <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <Grid>
                    {slice.items.map(({ href, title, image }) => (
                        <Item key={href!} title={title!}>
                            <Link href={href!}>
                                <Image
                                    src={image?.url || ''}
                                    alt={image?.alt || title || ''}
                                    //width={image.dimensions?.width!}
                                    //height={image.dimensions?.height!}
                                    //sizes="(max-width: 950px) 100vw, 33vw"
                                    loader={ImageLoader}
                                    fill
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

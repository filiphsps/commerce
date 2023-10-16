import { Content } from '@prismicio/client';
import { ImageLoader } from '@/utils/ImageLoader';
import Link from 'next/link';
import PageContent from '@/components/PageContent';
import { PrismicNextImage } from '@prismicio/next';
import type { SliceComponentProps } from '@prismicio/react';
import { styled } from '@linaria/react';

const Container = styled.section`
    //grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    width: 100%;
    padding: 0px;
    margin: 0px;
    flex-grow: 1;
`;
const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: unset;
    width: 100%;
    flex-grow: 1;
    gap: var(--block-spacer-large);

    @media (min-width: 550px) {
        grid-template-columns: 1fr 1fr;
    }
    @media (min-width: 950px) {
        grid-template-columns: 1fr 1fr 1fr;
    }
`;

const Title = styled.div`
    text-align: center;
    font-size: 2rem;
    line-height: 2rem;
    color: var(--color-bright);
`;
const TitleContainer = styled.div`
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    height: auto;
    padding: var(--block-padding) var(--block-padding-large);
    transition: 250ms ease-in-out outline-color;
    border-radius: var(--block-border-radius);
    border-top-right-radius: 0px;
    border-top-left-radius: 0px;
    background: var(--accent-primary);

    @media (max-width: 950px) {
        align-items: center;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover,
        &:active {
            outline-color: var(--accent-primary);
        }
    }
`;

const Banner = styled(PrismicNextImage)`
    width: 100%;
    height: auto;
    aspect-ratio: 21 / 6;
    object-fit: cover;
    object-position: 20% center;
    transition: 250ms ease-in-out;
`;

const Item = styled(Link)`
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
    border-radius: var(--block-border-radius);
    cursor: pointer;
    transition: 250ms ease-in-out;

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--accent-secondary-light);

            img {
                transform: scale(1.1);
            }
        }
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
                        <Item key={href!} href={href! || ''} title={title!}>
                            <Banner
                                field={image}
                                width={300}
                                height={300}
                                sizes="(max-width: 950px) 200px, 25vw"
                                loader={ImageLoader}
                            />
                            <TitleContainer>
                                <Title>{title}</Title>
                            </TitleContainer>
                        </Item>
                    ))}
                </Grid>
            </PageContent>
        </Container>
    );
};

export default ImageGrid;

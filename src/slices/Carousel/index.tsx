import PageContent from '@/components/PageContent';
import { Content } from '@prismicio/client';
import { PrismicNextImage } from '@prismicio/next';
import type { SliceComponentProps } from '@prismicio/react';
import Link from 'next/link';
import Slider from 'react-slick';
import styled from 'styled-components';
import { ImageLoader } from '../../util/ImageLoader';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

const Content = styled.div`
    overflow: hidden;
    border-radius: var(--block-border-radius);

    .slick-slide > div {
        margin-bottom: -4px;
    }
`;

const ImageContainer = styled.div`
    overflow: hidden;
    position: relative;
    width: 100%;

    .Desktop {
        display: none;
    }

    @media (min-width: 950px) {
        .Mobile {
            display: none;
        }
        .Desktop {
            display: block;
        }
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;
    }
`;

/**
 * Props for `Carousel`.
 */
export type CarouselProps = SliceComponentProps<Content.CarouselSlice>;

/**
 * Component for "Carousel" Slices.
 */
const Carousel = ({ slice }: CarouselProps): JSX.Element => {
    const speed = Number.parseInt(slice.primary.delay || '3000');

    const settings = {
        dots: false,
        arrows: false,
        infinite: true,
        autoplay: true,
        autoplaySpeed: speed,
        slidesToShow: 1,
        slidesToScroll: 1
    };

    return (
        <>
            <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
                <style jsx global>{`
                    @import url('https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.9.0/slick-theme.css');
                    @import url('https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.9.0/slick.css');
                `}</style>
                <PageContent>
                    <Content>
                        <Slider {...settings}>
                            {slice.items.map((slide, index) => {
                                return (
                                    <Link key={index} href={slide.href! || ''}>
                                        <ImageContainer>
                                            {slide.image?.url && slide.mobile_image?.url && (
                                                <>
                                                    <PrismicNextImage
                                                        field={slide.mobile_image}
                                                        className="Image Mobile"
                                                        width={300}
                                                        sizes="(max-width: 500px) 250px, 300px"
                                                        loading={slide.defer ? 'lazy' : 'eager'}
                                                        priority={slide.defer ? false : true}
                                                        loader={ImageLoader}
                                                    />
                                                    <PrismicNextImage
                                                        field={slide.image}
                                                        className="Image Desktop"
                                                        loading={slide.defer ? 'lazy' : 'eager'}
                                                        priority={slide.defer ? false : true}
                                                        loader={ImageLoader}
                                                    />
                                                </>
                                            )}
                                        </ImageContainer>
                                    </Link>
                                );
                            })}
                        </Slider>
                    </Content>
                </PageContent>
            </Container>
        </>
    );
};

export default Carousel;

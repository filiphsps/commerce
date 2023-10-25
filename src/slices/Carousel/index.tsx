'use client';

import PageContent from '@/components/PageContent';
import Link from '@/components/link';
import { ImageLoader } from '@/utils/ImageLoader';
import { Content } from '@prismicio/client';
import { PrismicNextImage } from '@prismicio/next';
import type { SliceComponentProps } from '@prismicio/react';
import Slider from 'react-slick';
import styled from 'styled-components';

const Container = styled.section`
    width: 100%;
`;

const Content = styled.div`
    overflow: hidden visible;

    @media (max-width: 950px) {
        width: 100vw;
        margin: 0 calc(var(--block-spacer-large) * -1);
        padding: 0 var(--block-spacer-large);

        .slick-slide > div {
            padding: 0 var(--block-spacer-tiny);
        }
    }

    .slick-slide > div {
        margin-bottom: -0px;
    }
`;

const ImageContainer = styled.div`
    overflow: hidden;
    width: 100%;
    border: var(--block-border-width) solid var(--accent-secondary);
    border-radius: var(--block-border-radius);

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
    const speed = (slice.primary.delay && Number.parseInt(slice.primary.delay)) || 3000;

    const settings = {
        dots: false,
        arrows: false,
        infinite: true,
        autoplay: true,
        autoplaySpeed: speed,
        touchMove: false,
        swipe: false,
        swipeToSlide: false,
        accessibility: false,
        adaptiveHeight: true,
        slidesToShow: 1,
        slidesToScroll: 1
    };

    return (
        <>
            <Container data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
                <PageContent>
                    <Content>
                        <Slider {...settings}>
                            {slice.items.map((slide, index) => {
                                return (
                                    <Link key={index} href={slide.href! || ''} prefetch={false}>
                                        <ImageContainer>
                                            {slide.image?.url && slide.mobile_image?.url && (
                                                <>
                                                    <PrismicNextImage
                                                        field={slide.mobile_image}
                                                        className="Image Mobile"
                                                        width={250}
                                                        height={100}
                                                        sizes="(max-width: 500px) 200px, 300px"
                                                        loading={slide.defer ? 'lazy' : 'eager'}
                                                        priority={slide.defer ? false : true}
                                                        imgixParams={{ q: 65 }}
                                                        loader={ImageLoader}
                                                        fallbackAlt=""
                                                    />
                                                    <PrismicNextImage
                                                        field={slide.image}
                                                        className="Image Desktop"
                                                        loading={slide.defer ? 'lazy' : 'eager'}
                                                        priority={slide.defer ? false : true}
                                                        loader={ImageLoader}
                                                        fallbackAlt=""
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

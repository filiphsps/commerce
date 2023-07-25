import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';

import PageContent from '@/components/PageContent';
import { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import Image from 'next/image';
import Link from 'next/link';
import Slider from 'react-slick';
import styled from 'styled-components';
import { ImageLoader } from '../../src/util/ImageLoader';

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
                <PageContent>
                    <Content>
                        <Slider {...settings}>
                            {slice.items.map((slide, index) => {
                                return (
                                    <Link key={index} href={slide.href!}>
                                        <ImageContainer>
                                            {slide.image?.url && slide.mobile_image?.url && (
                                                <>
                                                    <Image
                                                        className="Image Mobile"
                                                        src={slide.mobile_image.url || ''}
                                                        alt={slide.mobile_image.alt || ''}
                                                        title={slide.mobile_image?.alt || undefined}
                                                        width={slide.mobile_image.dimensions?.width}
                                                        height={
                                                            slide.mobile_image.dimensions?.height
                                                        }
                                                        priority={true}
                                                        loader={ImageLoader}
                                                    />
                                                    <Image
                                                        className="Image Desktop"
                                                        src={slide.image.url || ''}
                                                        alt={slide.image.alt || ''}
                                                        title={slide.image?.alt || undefined}
                                                        width={slide.image.dimensions?.width}
                                                        height={slide.image.dimensions?.height}
                                                        priority={true}
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

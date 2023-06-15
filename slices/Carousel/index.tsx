import { Content } from '@prismicio/client';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import Slider from 'react-slick';
import styled from 'styled-components';
import { useWindowSize } from 'rooks';

const Container = styled.div`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

const ImageContainer = styled.div`
    position: relative;
    width: 100%;

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
    const speed = slice.primary.delay || 3000;
    const { outerWidth } = useWindowSize();

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
            <Head>
                <link
                    rel="stylesheet"
                    type="text/css"
                    href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.min.css"
                />
                <link
                    rel="stylesheet"
                    type="text/css"
                    href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css"
                />
            </Head>
            <Container>
                <PageContent>
                    <Slider {...settings}>
                        {slice.items.map((slide, index) => {
                            const image = (!outerWidth || outerWidth > 960) && slide?.image || slide.mobile_image;
                            return (
                                <Link key={index} href={slide.href!}>
                                    <ImageContainer>
                                        <Image
                                            className="Image"
                                            src={image?.url || ''}
                                            alt={image?.alt || ''}
                                            title={image?.alt || undefined}
                                            placeholder="empty"
                                            width={image.dimensions?.width}
                                            height={image.dimensions?.height}
                                            priority={true}
                                            />
                                    </ImageContainer>
                                </Link>
                            );
                        })}
                    </Slider>
                </PageContent>
            </Container>
        </>
    );
};

export default Carousel;

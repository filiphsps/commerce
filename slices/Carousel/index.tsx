import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import { useEffect, useState } from 'react';

import { Content } from '@prismicio/client';
import Image from 'next/image';
import Link from 'next/link';
import PageContent from '../../src/components/PageContent';
import { SliceComponentProps } from '@prismicio/react';
import Slider from 'react-slick';
import styled from 'styled-components';
import { useWindowSize } from 'rooks';

const Container = styled.section`
    width: 100%;
    padding: 0px;
    margin: 0px;
`;

const ImageContainer = styled.div`
    overflow: hidden;
    position: relative;
    width: 100%;
    border-radius: var(--block-border-radius);

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
    const { outerWidth } = useWindowSize();
    const [isMobile, setIsMobile] = useState(false);

    const settings = {
        dots: false,
        arrows: false,
        infinite: true,
        autoplay: true,
        autoplaySpeed: speed,
        slidesToShow: 1,
        slidesToScroll: 1
    };

    useEffect(() => {
        if (!outerWidth) return;

        if (outerWidth > 960 && isMobile) setIsMobile(false);
        else if (outerWidth <= 960 && !isMobile) setIsMobile(true);
    }, [outerWidth]);

    return (
        <>
            <Container>
                <PageContent>
                    <Slider {...settings}>
                        {slice.items.map((slide, index) => {
                            const image = isMobile ? slide.mobile_image : slide.image;
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

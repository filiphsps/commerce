import React, { FunctionComponent } from 'react';

import Head from 'next/head';
import Image from 'next/legacy/image';
import Link from 'next/link';
import PageContent from '../../../PageContent';
import Slider from 'react-slick';

interface CarouselProps {
    data?: any;
    index: number;
}
const Carousel: FunctionComponent<CarouselProps> = (props) => {
    const speed = props?.data?.delay || 3000;

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
        <section className={`Slice Slice-Carousel Index-${props.index}`}>
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
            <PageContent
                style={{
                    padding: '1rem 0px'
                }}
            >
                <Slider {...settings}>
                    {props.data.items.map((slide, index) => {
                        return (
                            <Link key={index} href={slide?.href || ''}>
                                <Image
                                    className="Image"
                                    src={slide?.image?.url}
                                    alt={slide?.image?.alt}
                                    title={slide?.image?.alt}
                                    width={1920}
                                    height={300}
                                    layout="intrinsic"
                                    placeholder="empty"
                                    priority={true}
                                />
                            </Link>
                        );
                    })}
                </Slider>
            </PageContent>
        </section>
    );
};

export default Carousel;

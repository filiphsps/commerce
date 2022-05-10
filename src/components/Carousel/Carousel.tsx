import 'react-responsive-carousel/lib/styles/carousel.min.css';

import React from 'react';
import { Carousel as ReactCarousel } from 'react-responsive-carousel';

const Carousel = (props: any) => {
    return (
        <div className={`Carousel ${props.className}`}>
            <ReactCarousel showThumbs={false} infiniteLoop={true} {...props}>
                {props.children}
            </ReactCarousel>
        </div>
    );
};

export default Carousel;

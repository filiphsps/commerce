import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import Image from 'next/image';
import Link from '../../../Link';
import PageContent from '../../../PageContent';

interface CarouselProps {
    data?: any;
}
const Carousel: FunctionComponent<CarouselProps> = (props) => {
    const speed = props?.data?.delay || 3000;
    const [state, setState] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            return setState((state) =>
                state + 1 >= props.data.items.length ? 0 : state + 1
            );
        }, speed);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="Slice Slice-Carousel">
            <PageContent
                style={{
                    padding: '1rem 0px'
                }}
            >
                {props.data.items.map((slide, index) => (
                    <Link
                        key={index}
                        to={slide?.href}
                        style={{ display: state === index ? `block` : `none` }}
                    >
                        <Image
                            className="Image"
                            src={slide?.image?.url}
                            width={1920}
                            height={300}
                            loading="lazy"
                            layout="intrinsic"
                            placeholder="empty"
                        />
                    </Link>
                ))}
            </PageContent>
        </div>
    );
};

export default memo(Carousel);

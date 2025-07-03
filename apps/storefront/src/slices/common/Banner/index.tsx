import { BannerAside } from './banner-aside';
import { BannerDefault } from './banner-default';

import type { Content as PrismicContent } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `Banner`.
 */
export type BannerProps = SliceComponentProps<PrismicContent.BannerSlice>;

/**
 * Component for "Banner" Slices.
 */
const Banner = ({ slice, ...props }: BannerProps) => {
    switch (slice.variation) {
        case 'default':
            return <BannerDefault slice={slice} {...props} />;
        case 'aside':
            return <BannerAside slice={slice} {...props} />;
        default:
            return <BannerDefault slice={slice} {...props} />;
    }
};

export default Banner;

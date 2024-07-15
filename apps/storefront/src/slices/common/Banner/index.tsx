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
const Banner = ({ slice }: BannerProps): JSX.Element => {
    switch (slice.variation) {
        case 'default':
            return <BannerDefault slice={slice} />;
        case 'aside':
            return <BannerAside slice={slice} />;
        default:
            return <BannerDefault slice={slice} />;
    }
};

export default Banner;

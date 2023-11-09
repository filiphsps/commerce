import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `NavigationItem`.
 */
export type NavigationItemProps = SliceComponentProps<Content.NavigationItemSlice>;

/**
 * Component for "NavigationItem" Slices.
 */
const NavigationItem = ({ slice }: NavigationItemProps): JSX.Element => {
    return (
        <section data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            Placeholder component for navigation_item (variation: {slice.variation}) Slices
        </section>
    );
};

export default NavigationItem;

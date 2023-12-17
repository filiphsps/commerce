import type { SliceComponentProps } from '@prismicio/react';

import { Alert as AlertComponent } from '@/components/informational/alert';
import { PrismicText } from '@/components/typography/prismic-text';
import type { Content } from '@prismicio/client';

/**
 * Props for `Alert`.
 */
export type AlertProps = SliceComponentProps<Content.AlertSlice>;

/**
 * Component for "Alert" Slices.
 */
const Alert = ({ slice }: AlertProps): JSX.Element => {
    return (
        <AlertComponent
            severity={slice.primary.severity}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <PrismicText data={slice.primary.content} />
        </AlertComponent>
    );
};

export default Alert;

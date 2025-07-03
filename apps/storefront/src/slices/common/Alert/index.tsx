import { Alert as AlertComponent } from '@/components/informational/alert';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `Alert`.
 */
export type AlertProps = SliceComponentProps<Content.AlertSlice>;

/**
 * Component for "Alert" Slices.
 */
const Alert = ({ slice }: AlertProps) => {
    const showIcon = slice.primary.show_icon === true || false;

    return (
        <AlertComponent
            severity={slice.primary.severity}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            icon={showIcon ? undefined : false}
        >
            <PrismicText data={slice.primary.content} />
        </AlertComponent>
    );
};

export default Alert;

import type { SliceComponentProps } from '@prismicio/react';

import { Alert as AlertComponent } from '@/components/Alert';
import PageContent from '@/components/page-content';
import { PrismicText } from '@/components/typography/prismic-text';
import type { Content } from '@prismicio/client';
import styles from './alert.module.scss';

/**
 * Props for `Alert`.
 */
export type AlertProps = SliceComponentProps<Content.AlertSlice>;

/**
 * Component for "Alert" Slices.
 */
const Alert = ({ slice }: AlertProps): JSX.Element => {
    return (
        <section className={styles.container} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent>
                <AlertComponent severity={slice.primary.severity}>
                    <PrismicText data={slice.primary.content} />
                </AlertComponent>
            </PageContent>
        </section>
    );
};

export default Alert;

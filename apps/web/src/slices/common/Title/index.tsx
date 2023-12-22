import 'server-only';

import { PrismicText } from '@/components/typography/prismic-text';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import styles from './title.module.scss';

/**
 * Props for `Title`.
 */
export type TitleProps = SliceComponentProps<Content.TitleSlice>;

/**
 * Component for "Title" Slices.
 */
const Title = ({ slice }: TitleProps): JSX.Element => {
    return (
        <section className={styles.container} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <div
                className={`${styles.content} ${
                    (slice.primary.alignment === 'left' && styles['align-left']) ||
                    (slice.primary.alignment === 'right' && styles['align-right']) ||
                    styles['align-center']
                }`}
            >
                <PrismicText data={slice.primary.content} />
            </div>
        </section>
    );
};

Title.skeleton = ({ slice }: { slice: Content.TitleSlice }) => <Title {...(slice as any)} />;

Title.displayName = 'Nordcom.Slices.Collection';
export default Title;

import type { SliceComponentProps } from '@prismicio/react';

import PageContent from '@/components/page-content';
import { Overview } from '@/components/typography/Overview';
import { PrismicText } from '@/components/typography/prismic-text';
import type { Content } from '@prismicio/client';
import styles from './overview.module.scss';

/**
 * Props for `Overview`.
 */
export type OverviewProps = SliceComponentProps<Content.TextBlockSlice>;

/**
 * Component for "Overview" Slices.
 */
const OverviewSlice = ({ slice }: OverviewProps): JSX.Element => {
    return (
        <section className={styles.container} data-slice-type={slice.slice_type} data-slice-variation={slice.variation}>
            <PageContent className={styles.content}>
                {slice?.items?.map((item, index) => {
                    return (
                        <Overview
                            key={index}
                            style={
                                (item.accent &&
                                    ({
                                        '--accent-primary': item.accent,
                                        '--accent-primary-light':
                                            'color-mix(in srgb, var(--accent-primary) 65%, var(--color-bright))',
                                        '--accent-primary-dark':
                                            'color-mix(in srgb, var(--accent-primary) 65%, var(--color-dark))'
                                    } as React.CSSProperties)) ||
                                undefined
                            }
                            layout={item.layout}
                            image={(item.image?.url && (item.image as any)) || undefined}
                            imageStyle={item.image_style}
                            body={<PrismicText data={item.text} />}
                        />
                    );
                })}
            </PageContent>
        </section>
    );
};

export default OverviewSlice;

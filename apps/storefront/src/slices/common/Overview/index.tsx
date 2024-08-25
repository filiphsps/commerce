import 'server-only';

import styles from './overview.module.scss';

import PageContent from '@/components/page-content';
import { Overview } from '@/components/typography/Overview';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `Overview`.
 */
export type OverviewProps = SliceComponentProps<Content.TextBlockSlice>;

/**
 * Component for "Overview" Slices.
 */
const OverviewSlice = ({ slice }: OverviewProps) => {
    if (((slice as any)?.items?.length || 0) <= 0) {
        return null;
    }

    return (
        <PageContent
            as="section"
            className={styles.container}
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {slice.items.map((item, index) => {
                return (
                    <Overview
                        key={index}
                        style={
                            !!(item.accent as any)
                                ? ({
                                      '--accent-primary': item.accent,
                                      '--accent-primary-light':
                                          'color-mix(in srgb, var(--accent-primary) 65%, var(--color-bright))',
                                      '--accent-primary-dark':
                                          'color-mix(in srgb, var(--accent-primary) 65%, var(--color-dark))'
                                  } as React.CSSProperties)
                                : undefined
                        }
                        layout={item.layout}
                        image={(item.image.url && (item.image as any)) || undefined}
                        imageStyle={item.image_style}
                        body={<PrismicText data={item.text} />}
                        data-layout={item.layout}
                    />
                );
            })}
        </PageContent>
    );
};

OverviewSlice.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (((slice as any)?.items?.length || 0) <= 0) {
        return null;
    }
    return <OverviewSlice {...({ slice } as any)} />;
};

OverviewSlice.displayName = 'Nordcom.Slices.Overview';
export default OverviewSlice;

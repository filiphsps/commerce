import 'server-only';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import { Overview } from '@/components/typography/overview';
import { PrismicText } from '@/components/typography/prismic-text';

/**
 * Props for `Overview`.
 */
export type OverviewProps = SliceComponentProps<Content.TextBlockSlice>;

/**
 * Component for "Overview" Slices.
 */
const OverviewSlice = ({ slice }: OverviewProps) => {
    if ((slice?.items || []).length <= 0) {
        return null;
    }

    return (
        <section
            className="m-0 flex w-full flex-col gap-3 p-0 md:gap-4"
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {slice.items.map((item, index) => {
                const image = item.image as {
                    url?: string;
                    alt?: string;
                    dimensions?: { height: number; width: number };
                };
                return (
                    <Overview
                        key={index}
                        layout={item.layout}
                        image={
                            image.url && image.dimensions
                                ? { url: image.url, alt: image.alt, dimensions: image.dimensions }
                                : undefined
                        }
                        imageStyle={item.image_style}
                        body={<PrismicText data={item.text} styled={false} />}
                        accent={item.accent || undefined}
                    />
                );
            })}
        </section>
    );
};

OverviewSlice.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice || (slice.items || []).length <= 0) {
        return null;
    }
    return <OverviewSlice {...({ slice } as unknown as OverviewProps)} />;
};

OverviewSlice.displayName = 'Nordcom.Slices.Overview';
export default OverviewSlice;

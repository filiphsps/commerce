import 'server-only';

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
    if (((slice as any)?.items || []).length <= 0) {
        return null;
    }

    return (
        <PageContent
            as="section"
            className="m-0 w-full gap-4 p-0"
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {slice.items.map((item, index) => {
                return (
                    <Overview
                        key={index}
                        layout={item.layout}
                        image={(item.image.url && (item.image as any)) || undefined}
                        imageStyle={item.image_style}
                        body={<PrismicText data={item.text} styled={false} />}
                        data-layout={item.layout}
                    />
                );
            })}
        </PageContent>
    );
};

OverviewSlice.skeleton = ({ slice }: { slice?: Content.CollectionSlice }) => {
    if (!slice || ((slice.items as any) || []).length <= 0) {
        return null;
    }
    return <OverviewSlice {...({ slice } as any)} />;
};

OverviewSlice.displayName = 'Nordcom.Slices.Overview';
export default OverviewSlice;

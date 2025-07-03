import { cn } from '@/utils/tailwind';

import { Card } from '@/components/layout/card';
import { Content } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Content as Slices } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

const DefaultContentBlock = (props: ContentBlockProps) => {
    const {
        primary: { text, width: wide }
    } = props.slice as Slices.ContentBlockSliceDefault;
    return (
        <Content
            data-slice-type={props.slice.slice_type}
            data-slice-variation={props.slice.variation}
            className={cn('prose w-full', wide && 'min-w-full', !wide && 'mx-auto')}
            as="section"
        >
            <PrismicText data={text} />
        </Content>
    );
};

const CardContentBlock = (props: ContentBlockProps) => {
    const {
        primary: { text, width: wide, border }
    } = props.slice as Slices.ContentBlockSliceCard;

    return (
        <Content
            data-slice-type={props.slice.slice_type}
            data-slice-variation={props.slice.variation}
            className={cn('prose w-full', wide && 'min-w-full', !wide && 'mx-auto')}
            as={Card}
            border={border}
        >
            <PrismicText data={text} />
        </Content>
    );
};

export type ContentBlockProps = SliceComponentProps<Slices.ContentBlockSlice>;
const ContentBlock = (props: ContentBlockProps) => {
    switch (props.slice.variation as string) {
        case 'default':
            return <DefaultContentBlock {...props} />;
        case 'card':
            return <CardContentBlock {...props} />;
    }

    throw new TypeError();
};

export default ContentBlock;

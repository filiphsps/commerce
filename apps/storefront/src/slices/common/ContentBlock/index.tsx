import { Card } from '@/components/layout/card';
import { Content } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Content as Slices } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

const DefaultContentBlock = (props: ContentBlockProps): JSX.Element => {
    const {
        primary: { text }
    } = props.slice as Slices.ContentBlockSliceDefault;
    return (
        <Content className="w-full" as="section">
            <PrismicText data={text} />
        </Content>
    );
};

const CardContentBlock = (props: ContentBlockProps): JSX.Element => {
    const {
        primary: { text, border }
    } = props.slice as Slices.ContentBlockSliceCard;

    return (
        <Content className="w-full" as={Card} border={border}>
            <PrismicText data={text} />
        </Content>
    );
};

export type ContentBlockProps = SliceComponentProps<Slices.ContentBlockSlice>;
const ContentBlock = (props: ContentBlockProps): JSX.Element => {
    switch (props.slice.variation as string) {
        case 'default':
            return <DefaultContentBlock {...props} />;
        case 'card':
            return <CardContentBlock {...props} />;
    }

    throw new TypeError();
};

export default ContentBlock;

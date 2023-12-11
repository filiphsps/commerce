'use client';

import { linkResolver } from '@/utils/prismic';
import type { RichTextField } from '@prismicio/client';
import { PrismicRichText } from '@prismicio/react';

export type PrismicTextProps = {
    data: RichTextField;
};
export const PrismicText = ({ data }: PrismicTextProps) => {
    return <PrismicRichText field={data} linkResolver={linkResolver} />;
};

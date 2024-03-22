'use client';

import { linkResolver } from '@/utils/prismic';
import { PrismicRichText } from '@prismicio/react';

import type { RichTextField } from '@prismicio/client';

export type PrismicTextProps = {
    data: RichTextField;
};
export const PrismicText = ({ data }: PrismicTextProps) => {
    return <PrismicRichText field={data} linkResolver={linkResolver} />;
};

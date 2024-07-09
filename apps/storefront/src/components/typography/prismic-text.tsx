'use client';

import { linkResolver } from '@/utils/prismic';
import { PrismicRichText } from '@prismicio/react';

import Link from '@/components/link';

import type { RichTextField } from '@prismicio/client';

export type PrismicTextProps = {
    data: RichTextField;
};
export const PrismicText = ({ data }: PrismicTextProps) => {
    if (data.length <= 0) return null;

    return (
        <PrismicRichText
            field={data}
            linkResolver={linkResolver}
            internalLinkComponent={Link}
            externalLinkComponent={Link}
        />
    );
};

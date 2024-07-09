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
            components={{
                paragraph: ({ children }) => (
                    <p className="block text-base leading-snug md:text-lg md:leading-tight">{children}</p>
                ),
                heading1: ({ children }) => (
                    <h1 className="text-2xl font-semibold leading-none md:text-4xl">{children}</h1>
                ),
                heading2: ({ children }) => (
                    <h2 className="text-xl font-semibold leading-tight md:text-2xl">{children}</h2>
                ),
                heading3: ({ children }) => (
                    <h3 className="text-lg font-semibold leading-tight md:text-xl">{children}</h3>
                ),
                strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
                listItem: ({ children }) => <li className="list-disc">{children}</li>,
                oListItem: ({ children }) => <li className="list-decimal">{children}</li>
            }}
        />
    );
};

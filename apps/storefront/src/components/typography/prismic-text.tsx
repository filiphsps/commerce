/* c8 ignore start */
'use client';

import type { RichTextField } from '@prismicio/client';
import { PrismicRichText } from '@prismicio/react';
import { Fragment, Suspense } from 'react';
import Link from '@/components/link';
import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';

export type PrismicTextProps = {
    data: RichTextField;
    /**
     * If set to `false` the text won't be styledd.
     */
    styled?: boolean;
    /**
     * If set to `true` the text won't be wrapped in `p`, `h1`, `h2` or `h3` tags.
     *
     * However, bold, italic, underline, strikethrough,
     * subscript and superscript will still be applied.
     */
    bare?: boolean;
};
export const PrismicText = ({ data, styled = true, bare = false }: PrismicTextProps) => {
    if (data.length <= 0) {
        return null;
    }

    return (
        <Suspense key={JSON.stringify(data)} fallback={<Fragment />}>
            <PrismicRichText
                field={data}
                linkResolver={linkResolver}
                internalLinkComponent={Link}
                externalLinkComponent={Link}
                components={{
                    paragraph: ({ children }) =>
                        bare ? (
                            children
                        ) : (
                            <p
                                className={cn(
                                    styled && 'block text-base leading-snug empty:hidden md:text-lg md:leading-tight',
                                )}
                            >
                                {children}
                            </p>
                        ),
                    heading1: ({ children }) =>
                        bare ? (
                            children
                        ) : (
                            <h1
                                className={cn(styled && 'font-semibold text-2xl leading-none empty:hidden md:text-4xl')}
                            >
                                {children}
                            </h1>
                        ),
                    heading2: ({ children }) =>
                        bare ? (
                            children
                        ) : (
                            <h2
                                className={cn(styled && 'font-semibold text-xl leading-tight empty:hidden md:text-2xl')}
                            >
                                {children}
                            </h2>
                        ),
                    heading3: ({ children }) =>
                        bare ? (
                            children
                        ) : (
                            <h3 className={cn(styled && 'font-semibold text-lg leading-tight empty:hidden md:text-xl')}>
                                {children}
                            </h3>
                        ),
                    strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
                    listItem: ({ children }) => <li className="list-disc">{children}</li>,
                    oListItem: ({ children }) => <li className="list-decimal">{children}</li>,
                }}
            />
        </Suspense>
    );
};
/* c8 ignore stop */

'use client';

import { Fragment, Suspense } from 'react';

import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { PrismicRichText } from '@prismicio/react';

import Link from '@/components/link';

import type { RichTextField } from '@prismicio/client';

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
                            <>{children as any}</>
                        ) : (
                            <p
                                className={cn(
                                    styled && 'block text-base leading-snug empty:hidden md:text-lg md:leading-tight'
                                )}
                            >
                                {children as any}
                            </p>
                        ),
                    heading1: ({ children }) =>
                        bare ? (
                            <>{children as any}</>
                        ) : (
                            <h1
                                className={cn(styled && 'text-2xl font-semibold leading-none empty:hidden md:text-4xl')}
                            >
                                {children as any}
                            </h1>
                        ),
                    heading2: ({ children }) =>
                        bare ? (
                            <>{children as any}</>
                        ) : (
                            <h2
                                className={cn(styled && 'text-xl font-semibold leading-tight empty:hidden md:text-2xl')}
                            >
                                {children as any}
                            </h2>
                        ),
                    heading3: ({ children }) =>
                        bare ? (
                            <>{children as any}</>
                        ) : (
                            <h3 className={cn(styled && 'text-lg font-semibold leading-tight empty:hidden md:text-xl')}>
                                {children as any}
                            </h3>
                        ),
                    strong: ({ children }) => <strong className="font-extrabold">{children as any}</strong>,
                    listItem: ({ children }) => <li className="list-disc">{children as any}</li>,
                    oListItem: ({ children }) => <li className="list-decimal">{children as any}</li>
                }}
            />
        </Suspense>
    );
};
/* c8 ignore stop */

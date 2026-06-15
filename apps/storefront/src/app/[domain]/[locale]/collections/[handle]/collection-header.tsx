import 'server-only';

import Image from 'next/image';
import type { JSX } from 'react';
import { cn } from '@/utils/tailwind';

export type CollectionHeaderImage = {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
};

export type CollectionHeaderProps = {
    title: string;
    image?: CollectionHeaderImage | null;
    className?: string;
};

/**
 * Collection page header with two treatments so the page never renders a bare, floating heading.
 *
 * When the collection carries an image it becomes a photographic hero band: the image fills the
 * banner, a tokenized scrim keeps the title legible, and the `on-dark` context flips the ink tokens
 * to light. With no image it falls back to a confident typographic header — an accent kicker rule
 * above the title with a hairline divider — rather than a lone `<h1>`.
 *
 * @param props.title - Collection title.
 * @param props.image - Optional collection image; presence switches to the hero treatment.
 * @param props.className - Additional class names for the header element.
 * @returns The collection header element.
 */
export function CollectionHeader({ title, image, className }: CollectionHeaderProps): JSX.Element {
    if (image?.url) {
        return (
            <header
                className={cn(
                    'on-dark relative isolate flex min-h-44 items-end overflow-hidden rounded-lg md:min-h-64',
                    className,
                )}
            >
                <Image
                    src={image.url}
                    alt={image.altText ?? ''}
                    fill
                    sizes="(max-width: 48em) 100vw, var(--page-width)"
                    className="object-cover object-center"
                    priority
                    decoding="async"
                    draggable={false}
                />
                <div
                    aria-hidden={true}
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(to top, color-mix(in oklab, var(--color-dark) 78%, transparent), color-mix(in oklab, var(--color-dark) 18%, transparent) 55%, transparent)',
                    }}
                />
                <h1 className="text-(color:var(--text)) relative z-1 p-5 font-bold text-h1 leading-tight md:p-8">
                    {title}
                </h1>
            </header>
        );
    }

    return (
        <header className={cn('flex flex-col gap-3 border-(--border-default) border-b border-solid pb-5', className)}>
            <span aria-hidden={true} className="h-1 w-10 rounded-full bg-primary" />
            <h1 className="text-(color:var(--text)) font-bold text-h1 leading-tight">{title}</h1>
        </header>
    );
}

CollectionHeader.displayName = 'Nordcom.Collections.CollectionHeader';

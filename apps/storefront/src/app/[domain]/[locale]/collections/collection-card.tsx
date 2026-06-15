import 'server-only';

import Image from 'next/image';
import type { JSX } from 'react';
import Link from '@/components/link';

export type CollectionCardData = {
    handle: string;
    title: string;
    image?: {
        url: string;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
    } | null;
};

/**
 * Collection tile for the `/collections` index: a 16:10 image (or a tokenized fallback) with the
 * title overlaid on a scrim. Links to the collection page. Visuals resolve from the shared
 * surface/border tokens, and the title sits in an `on-dark` context so it stays legible over both
 * imagery and the fallback fill.
 *
 * @param props.collection - Collection handle, title, and optional image.
 * @param props.priority - When `true`, eagerly loads the image (above-the-fold tiles).
 * @returns The collection tile link.
 */
export function CollectionCard({
    collection,
    priority = false,
}: {
    collection: CollectionCardData;
    priority?: boolean;
}): JSX.Element {
    const { handle, title, image } = collection;
    return (
        <Link
            href={`/collections/${handle}/`}
            prefetch={false}
            data-testid="collection-card"
            className="group on-dark focus-ring relative isolate flex aspect-3/2 items-end overflow-hidden rounded-lg border border-(--border-default) border-solid bg-(--surface-2)"
        >
            {image?.url ? (
                <Image
                    src={image.url}
                    alt={image.altText ?? title}
                    fill
                    sizes="(max-width: 48em) 50vw, 320px"
                    className="object-cover object-center transition-transform duration-300 ease-(--product-card-motion-ease) group-hover:scale-[1.03] motion-reduce:transition-none"
                    decoding="async"
                    draggable={false}
                    priority={priority}
                />
            ) : (
                <span
                    aria-hidden={true}
                    className="text-(color:var(--text-muted)) absolute inset-0 grid place-items-center text-[3rem] opacity-40"
                >
                    {title.slice(0, 1).toUpperCase()}
                </span>
            )}
            <div
                aria-hidden={true}
                className="absolute inset-0"
                style={{
                    background:
                        'linear-gradient(to top, color-mix(in oklab, var(--color-dark) 78%, transparent), color-mix(in oklab, var(--color-dark) 12%, transparent) 55%, transparent)',
                }}
            />
            <h2 className="text-(color:var(--text)) relative z-1 p-4 font-bold text-lg leading-tight md:p-5 md:text-xl">
                {title}
            </h2>
        </Link>
    );
}

CollectionCard.displayName = 'Nordcom.Collections.CollectionCard';

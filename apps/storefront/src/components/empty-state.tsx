import type { ElementType, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

/** Props for the {@link EmptyState} primitive. */
export type EmptyStateProps = {
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    action?: ReactNode;
    titleAs?: ElementType;
    className?: string;
    'data-testid'?: string;
};

/**
 * Shared, tokenized placeholder for empty, not-found, and error surfaces.
 *
 * Pure presentational and free of any `server-only` import, so both Client
 * Components (the search results list) and Server Components (cart, collection,
 * 404) can render it. Every visual resolves from the P3 semantic tokens
 * (`--surface-*`, `--text`, `--text-muted`, `--border-*`), so a theme-less shop
 * renders sensibly while a tenant theme recolors the whole block. The optional
 * `icon` is decorative (`aria-hidden`); the accessible meaning is carried by
 * `title`, and call-to-action labels live in the `action` slot.
 *
 * @param props.title - Headline naming the empty/error condition.
 * @param props.description - Optional supporting copy rendered below the title.
 * @param props.icon - Optional decorative glyph rendered in a token surface badge.
 * @param props.action - Optional call-to-action slot, e.g. a tokenized Button link.
 * @param props.titleAs - Heading element for the title; defaults to `h2`.
 * @param props.className - Additional class names merged onto the wrapper.
 * @param props.data-testid - Optional test hook forwarded to the wrapper element.
 * @returns The empty-state section element.
 */
export const EmptyState = ({
    title,
    description,
    icon,
    action,
    titleAs: TitleTag = 'h2',
    className,
    'data-testid': testId,
}: EmptyStateProps) => {
    return (
        <section
            data-testid={testId}
            className={cn(
                'text-(color:var(--text)) flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-(--border-default) border-solid bg-(--surface-1) px-6 py-12 text-center',
                className,
            )}
        >
            {icon ? (
                <div
                    aria-hidden="true"
                    className="text-(color:var(--text-muted)) flex size-16 items-center justify-center rounded-full bg-(--surface-2) [&>svg]:size-8"
                >
                    {icon}
                </div>
            ) : null}

            <div className="flex max-w-prose flex-col gap-2">
                <TitleTag className="text-(color:var(--text)) text-pretty font-bold text-2xl leading-tight">
                    {title}
                </TitleTag>

                {description ? (
                    <p className="text-(color:var(--text-muted)) text-pretty text-base leading-normal">{description}</p>
                ) : null}
            </div>

            {action ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
        </section>
    );
};

EmptyState.displayName = 'Nordcom.EmptyState';

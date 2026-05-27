import type { JSX } from 'react';
import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import { resolveLink } from './resolve-link';
import type { BannerBlockNode } from './types';

/**
 * Wraps a URL string in a CSS `url()` value with the inner string
 * single-quoted and unsafe characters escaped so the value can be safely
 * embedded in a style attribute without breaking out of the quoted CSS string.
 *
 * @param raw - The raw URL to wrap.
 * @returns A CSS `url('...')` string safe for use in inline styles.
 */
const cssUrl = (raw: string): string => {
    // Escape characters that would break out of the quoted CSS string —
    // backslash, single quote, and any line break (CSS strings can't span
    // lines; an unescaped newline terminates the value early). React
    // escapes the attribute as a whole, but the contents of `url()` are
    // CSS, not HTML.
    const safe = raw
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/[\n\r]/g, '');
    return `url('${safe}')`;
};

/**
 * Renders the CMS Banner block. Mirrors the old Prismic `Banner` (default
 * variation) slice — primary heading + optional subheading + CTA, with
 * an optional background image.
 *
 * `alignment` controls horizontal text alignment; mobile is always
 * centered for legibility, alignment kicks in at md+ widths.
 *
 * @param block - The CMS banner block node with heading, alignment, and optional CTA/background.
 * @param context - Render context carrying locale and other block-tree metadata.
 * @returns The rendered banner section element.
 */
export const BannerBlock = ({ block, context }: { block: BannerBlockNode; context: BlockContext }): JSX.Element => {
    const bgUrl = typeof block.background === 'string' ? undefined : block.background?.url;
    const cta = resolveLink(block.cta, { locale: context.locale });

    return (
        <section
            data-block-type="banner"
            data-alignment={block.alignment}
            className={cn(
                'relative flex flex-col items-center justify-center gap-4 rounded-lg bg-primary p-8 text-primary-foreground',
                bgUrl && 'bg-center bg-cover text-white',
            )}
            style={bgUrl ? { backgroundImage: cssUrl(bgUrl) } : undefined}
        >
            <div
                className={cn(
                    'flex w-full flex-col gap-2 text-center',
                    'md:data-[alignment=left]:items-start md:data-[alignment=left]:text-left',
                    'md:data-[alignment=center]:items-center md:data-[alignment=center]:text-center',
                    'md:data-[alignment=right]:items-end md:data-[alignment=right]:text-right',
                )}
                data-alignment={block.alignment}
            >
                <h1 className="font-bold text-2xl leading-tight md:text-4xl">{block.heading}</h1>
                {block.subheading ? <p className="text-base md:text-lg">{block.subheading}</p> : null}
            </div>

            {cta ? (
                <Button
                    as={Link}
                    href={cta.href}
                    target={cta.openInNewTab ? '_blank' : undefined}
                    className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-black transition-colors hover:bg-black hover:text-white md:px-6 md:py-3 md:text-lg"
                >
                    {block.cta?.label ?? 'Learn more'}
                </Button>
            ) : null}
        </section>
    );
};

BannerBlock.displayName = 'Nordcom.Blocks.Banner';

/**
 * Loading placeholder for the Banner block. Holds the same hero shape
 * (full-width rounded section, centered/aligned content stack) and
 * conditionally renders subheading + CTA placeholders to match what the
 * editor configured — important for CLS, because a banner above the
 * fold otherwise shifts the entire viewport when the real heading and
 * CTA land.
 *
 * @param block - The CMS banner block node; used to mirror the live block's structure for accurate sizing.
 * @returns The skeleton banner section element.
 */
const BannerBlockSkeleton = ({ block }: { block: BannerBlockNode }): JSX.Element => {
    const hasCta = Boolean(block.cta);
    return (
        <section
            data-block-type="banner"
            data-alignment={block.alignment}
            data-skeleton-variant="banner"
            className="relative flex flex-col items-center justify-center gap-4 rounded-lg bg-gray-100 p-8"
        >
            <div
                className={cn(
                    'flex w-full flex-col gap-3 text-center',
                    'md:data-[alignment=left]:items-start',
                    'md:data-[alignment=center]:items-center',
                    'md:data-[alignment=right]:items-end',
                )}
                data-alignment={block.alignment}
            >
                <div className="h-8 w-2/3 max-w-md rounded-sm md:h-10" data-skeleton />
                {block.subheading ? <div className="h-4 w-1/2 max-w-sm rounded-sm" data-skeleton /> : null}
            </div>
            {hasCta ? <div className="h-10 w-32 rounded-full md:h-12 md:w-40" data-skeleton /> : null}
        </section>
    );
};
BannerBlockSkeleton.displayName = 'Nordcom.Blocks.Banner.Skeleton';
BannerBlock.Skeleton = BannerBlockSkeleton;

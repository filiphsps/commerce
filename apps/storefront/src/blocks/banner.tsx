import type { JSX } from 'react';
import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import { resolveLink } from './resolve-link';
import type { BannerBlockNode } from './types';

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

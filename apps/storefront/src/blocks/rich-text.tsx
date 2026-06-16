import { ChevronUp as ChevronUpIcon } from 'lucide-react';
import type { JSX } from 'react';
import { Content as ContentContainer } from '@/components/typography/content';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import { isRichTextEmpty, RichText, type RichTextDocument } from './rich-text-renderer';
import type { RichTextBlockNode } from './types';

/**
 * Renders the CMS rich-text block. Combines the two old Prismic slices —
 * `ContentBlock` (default rich text) and `CollapsibleText` (expand/collapse)
 * — into one block, gated by `collapsible`.
 *
 * The ProseMirror document is rendered via the local `RichText` renderer
 * inside the shared `Content` typography wrapper so prose styling matches
 * the rest of the storefront.
 */
export const RichTextBlock = ({
    block,
    context,
}: {
    block: RichTextBlockNode;
    context: BlockContext;
}): JSX.Element | null => {
    const body = block.body as RichTextDocument;
    if (isRichTextEmpty(body)) return null;

    if (block.collapsible) {
        return (
            <details
                data-block-type="rich-text"
                data-variant="collapsible"
                open={!block.collapsedByDefault}
                className={cn(
                    'group w-full select-none appearance-none rounded-lg border-(--border-default) border-2 border-solid bg-(--surface-1) py-3 transition-all duration-150',
                )}
            >
                <summary
                    className={cn(
                        'flex cursor-pointer appearance-none items-center justify-start gap-2 border-(--border-default) border-0 border-solid px-2 transition-all duration-150 group-open:mb-3 group-open:border-b-2 group-open:pb-3',
                    )}
                >
                    <div className="flex h-8 w-12 items-center justify-center">
                        <ChevronUpIcon className="h-full w-full py-1 transition-transform duration-150 group-open:rotate-180" />
                    </div>
                    <div className="font-semibold text-base leading-snug">{block.collapseLabel ?? 'Read more'}</div>
                </summary>

                <ContentContainer className="px-4 py-1">
                    <RichText data={body} locale={context.locale} />
                </ContentContainer>
            </details>
        );
    }

    return (
        <ContentContainer
            data-block-type="rich-text"
            data-variant="default"
            className="prose mx-auto w-full"
            as="section"
        >
            <RichText data={body} locale={context.locale} />
        </ContentContainer>
    );
};

RichTextBlock.displayName = 'Nordcom.Blocks.RichText';

/**
 * Loading placeholder for the rich-text block. The rich-text body isn't
 * available pre-load, so render a 3-row paragraph stack at the same prose
 * width / spacing as the live block. For the collapsible variant we
 * preserve the summary chrome (chevron + label slot) since that's the
 * editor-defined structure that determines the collapsed height.
 */
const RichTextBlockSkeleton = ({ block }: { block: RichTextBlockNode }): JSX.Element => {
    if (block.collapsible) {
        return (
            <div
                data-block-type="rich-text"
                data-variant="collapsible"
                data-skeleton-variant="rich-text"
                className={cn(
                    'group w-full select-none appearance-none rounded-lg border-(--border-default) border-2 border-solid bg-(--surface-1) py-3',
                )}
            >
                <div className="flex items-center justify-start gap-2 px-2 pb-3">
                    <div className="flex h-8 w-12 items-center justify-center" aria-hidden>
                        <ChevronUpIcon className="h-full w-full py-1 opacity-40" />
                    </div>
                    <div className="h-4 w-32 rounded-sm" data-skeleton />
                </div>
            </div>
        );
    }

    return (
        <section
            data-block-type="rich-text"
            data-variant="default"
            data-skeleton-variant="rich-text"
            className="prose mx-auto flex w-full max-w-prose flex-col gap-2"
        >
            <div className="h-4 w-full rounded-sm" data-skeleton />
            <div className="h-4 w-11/12 rounded-sm" data-skeleton />
            <div className="h-4 w-9/12 rounded-sm" data-skeleton />
        </section>
    );
};
RichTextBlockSkeleton.displayName = 'Nordcom.Blocks.RichText.Skeleton';
RichTextBlock.Skeleton = RichTextBlockSkeleton;

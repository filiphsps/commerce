import { ChevronUp as ChevronUpIcon } from 'lucide-react';
import type { JSX } from 'react';
import { Content as ContentContainer } from '@/components/typography/content';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import { isRichTextEmpty, type LexicalRoot, RichText } from './rich-text-renderer';
import type { RichTextBlockNode } from './types';

/**
 * Renders the CMS rich-text block. Combines the two old Prismic slices —
 * `ContentBlock` (default rich text) and `CollapsibleText` (expand/collapse)
 * — into one block, gated by `collapsible`.
 *
 * The Lexical document is rendered via the local `RichText` renderer
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
    const body = block.body as LexicalRoot;
    if (isRichTextEmpty(body)) return null;

    if (block.collapsible) {
        return (
            <details
                data-block-type="rich-text"
                data-variant="collapsible"
                open={!block.collapsedByDefault}
                className={cn(
                    'group w-full select-none appearance-none rounded-lg border-2 border-gray-300 border-solid bg-gray-100 py-3 transition-all duration-150',
                )}
            >
                <summary
                    className={cn(
                        'flex cursor-pointer appearance-none items-center justify-start gap-2 border-0 border-gray-300 border-solid px-2 transition-all duration-150 group-open:mb-3 group-open:border-b-2 group-open:pb-3',
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

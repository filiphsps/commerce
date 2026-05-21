import type { JSX } from 'react';
import type { HtmlBlockNode } from './types';

/**
 * Renders the CMS HTML block. Mirrors the old Prismic `CustomHtml` slice
 * — admins are trusted to author safe HTML so the block uses
 * `dangerouslySetInnerHTML`. `suppressHydrationWarning` guards against
 * legitimate edits (third-party widgets, dates) shifting markup between
 * server and client renders.
 */
export const HtmlBlock = ({ block }: { block: HtmlBlockNode }): JSX.Element => {
    return (
        <section
            data-block-type="html"
            className="empty:contents"
            dangerouslySetInnerHTML={{ __html: block.html ?? '' }}
            suppressHydrationWarning={true}
            suppressContentEditableWarning={true}
        />
    );
};

HtmlBlock.displayName = 'Nordcom.Blocks.Html';

/**
 * Loading placeholder for the HTML block. We cannot reasonably mimic the
 * authored HTML's specific shape (it can be anything from a single button
 * to an embedded widget), so render a generic stack of text-row skeletons
 * that approximates a typical inline content size.
 */
const HtmlBlockSkeleton = (_: { block: HtmlBlockNode }): JSX.Element => {
    return (
        <section data-block-type="html" data-skeleton-variant="html" className="flex w-full flex-col gap-2">
            <div className="h-4 w-full rounded-sm" data-skeleton />
            <div className="h-4 w-11/12 rounded-sm" data-skeleton />
            <div className="h-4 w-3/4 rounded-sm" data-skeleton />
        </section>
    );
};
HtmlBlockSkeleton.displayName = 'Nordcom.Blocks.Html.Skeleton';
HtmlBlock.Skeleton = HtmlBlockSkeleton;

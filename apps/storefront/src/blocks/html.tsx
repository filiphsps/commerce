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

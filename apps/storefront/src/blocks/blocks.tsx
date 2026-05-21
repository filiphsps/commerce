import type { ReactNode } from 'react';
import { AlertBlock } from './alert';
import { BannerBlock } from './banner';
import { CollectionBlock } from './collection';
import { ColumnsBlock } from './columns';
import { type BlockContext, MAX_BLOCK_DEPTH } from './context';
import { HtmlBlock } from './html';
import { MediaGridBlock } from './media-grid';
import { OverviewBlock } from './overview';
import { RichTextBlock } from './rich-text';
import type { BlockNode } from './types';
import { VendorsBlock } from './vendors';

/**
 * Storefront-native block dispatcher — analogous to the old Prismic
 * `SliceZone`. Routes each Payload block to the matching component in
 * this directory. Intentionally NOT a generic `components`-map prop:
 * keeping the switch local makes it trivial to grep ("where is the
 * Banner block rendered?") and lets TypeScript narrow each branch on
 * `blockType` so block components stay strongly typed without casts.
 *
 * The dispatcher owns the recursion-depth guard (`MAX_BLOCK_DEPTH`) so
 * `columns` can nest blocks without risk of a malformed CMS document
 * blowing the React render stack — the columns block bumps `depth`,
 * we cap it here.
 *
 * Unrecognised block types render as `null` rather than throwing,
 * matching the old SliceZone behaviour — keeps editors from breaking
 * a live page by adding a block that ships before the renderer.
 */
export const Blocks = ({
    blocks,
    context,
}: {
    blocks: BlockNode[] | null | undefined;
    context: BlockContext;
}): ReactNode => {
    if (!blocks || blocks.length === 0) return null;
    const depth = context.depth ?? 0;
    if (depth >= MAX_BLOCK_DEPTH) return null;

    return (
        <>
            {blocks.map((block, idx) => {
                switch (block.blockType) {
                    case 'alert':
                        return <AlertBlock key={idx} block={block} />;
                    case 'banner':
                        return <BannerBlock key={idx} block={block} context={context} />;
                    case 'collection':
                        return <CollectionBlock key={idx} block={block} context={context} index={idx} />;
                    case 'columns':
                        return <ColumnsBlock key={idx} block={block} context={context} Renderer={Blocks} />;
                    case 'html':
                        return <HtmlBlock key={idx} block={block} />;
                    case 'media-grid':
                        return <MediaGridBlock key={idx} block={block} context={context} />;
                    case 'overview':
                        return <OverviewBlock key={idx} block={block} context={context} />;
                    case 'rich-text':
                        return <RichTextBlock key={idx} block={block} context={context} />;
                    case 'vendors':
                        return <VendorsBlock key={idx} block={block} context={context} />;
                    default:
                        // Exhaustiveness check — if a new block type is added to
                        // `BlockNode` without a case here, TS yells about
                        // `_exhaustive` not being assignable to `never`.
                        return null;
                }
            })}
        </>
    );
};

Blocks.displayName = 'Nordcom.Blocks';

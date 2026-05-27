import type { ReactNode } from 'react';
import { AlertBlock } from './AlertBlock';
import { BannerBlock } from './BannerBlock';
import { CollectionBlock } from './CollectionBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { HtmlBlock } from './HtmlBlock';
import { MediaGridBlock } from './MediaGridBlock';
import { OverviewBlock } from './OverviewBlock';
import { RichTextBlock } from './RichTextBlock';
import type { BlockNode, BlockRenderContext } from './types';
import { VendorsBlock } from './VendorsBlock';

const MAX_DEPTH = 6;

/**
 * Renders a flat array of CMS {@link BlockNode}s by dispatching each block to
 * its corresponding component. Recursively called by `ColumnsBlock` for nested
 * content arrays; `MAX_DEPTH` prevents runaway recursion.
 *
 * @param blocks - Array of typed block nodes to render.
 * @param context - Shared render context (locale, Shopify loaders, nesting depth).
 * @returns A React fragment containing the rendered block sequence, or `null`
 *   when the nesting depth limit is exceeded.
 *
 * @example
 *   <BlockRenderer blocks={page.blocks} context={{ locale, loaders }} />
 */
export function BlockRenderer({ blocks, context }: { blocks: BlockNode[]; context: BlockRenderContext }): ReactNode {
    const depth = context.depth ?? 0;
    if (depth >= MAX_DEPTH) return null;

    return (
        <>
            {blocks.map((block, idx) => {
                switch (block.blockType) {
                    case 'rich-text':
                        return <RichTextBlock key={idx} block={block} />;
                    case 'alert':
                        return <AlertBlock key={idx} block={block} />;
                    case 'html':
                        return <HtmlBlock key={idx} block={block} />;
                    case 'media-grid':
                        return <MediaGridBlock key={idx} block={block} context={context} />;
                    case 'banner':
                        return <BannerBlock key={idx} block={block} context={context} />;
                    case 'columns':
                        return <ColumnsBlock key={idx} block={block} context={context} Renderer={BlockRenderer} />;
                    case 'collection':
                        return <CollectionBlock key={idx} block={block} context={context} />;
                    case 'vendors':
                        return <VendorsBlock key={idx} block={block} context={context} />;
                    case 'overview':
                        return <OverviewBlock key={idx} block={block} context={context} />;
                    default:
                        return null;
                }
            })}
        </>
    );
}

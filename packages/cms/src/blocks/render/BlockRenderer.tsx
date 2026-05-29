import { Fragment, type ReactNode } from 'react';
import { isBlockType } from '../registry';
import { CMS_BLOCKS } from './registry';
import type { BlockNode, BlockRenderContext } from './types';

const MAX_DEPTH = 6;

/**
 * Renders a flat array of CMS {@link BlockNode}s by looking each block up in
 * the shared {@link CMS_BLOCKS} registry. Recursively passed to `ColumnsBlock`
 * for nested content arrays; `MAX_DEPTH` prevents runaway recursion.
 *
 * Unknown block types (a CMS document referencing a block that ships before
 * its renderer) fall through to a no-op rather than throwing, so a malformed
 * document never crashes the editor surface.
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
                if (!isBlockType(block.blockType)) return null;

                const entry = CMS_BLOCKS[block.blockType];
                return <Fragment key={idx}>{entry.render({ block, context, Renderer: BlockRenderer })}</Fragment>;
            })}
        </>
    );
}

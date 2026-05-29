import { isBlockType } from '@nordcom/commerce-cms/blocks';
import { trace } from '@opentelemetry/api';
import { Fragment, type ReactNode } from 'react';
import { type BlockContext, MAX_BLOCK_DEPTH } from './context';
import { STOREFRONT_BLOCKS } from './registry';
import type { BlockNode } from './types';

type BlocksProps = {
    blocks: BlockNode[] | null | undefined;
    context: BlockContext;
};

/**
 * Storefront-native block dispatcher — analogous to the old Prismic
 * `SliceZone`. Looks each Payload block up in the shared `STOREFRONT_BLOCKS`
 * registry (keyed by the canonical `BlockType` set owned by
 * `@nordcom/commerce-cms`), so adding a block is a single registration rather
 * than touching three parallel switches.
 *
 * The dispatcher owns the recursion-depth guard (`MAX_BLOCK_DEPTH`) so
 * `columns` can nest blocks without risk of a malformed CMS document blowing
 * the React render stack — the columns block bumps `depth`, we cap it here.
 *
 * Unrecognized block types render as `null` rather than throwing, matching the
 * old SliceZone behavior — keeps editors from breaking a live page by adding a
 * block that ships before the renderer. An OTEL span event records the miss so
 * ops can see when a CMS document references an unknown block type.
 *
 * @param blocks - The block nodes to render, or `null`/`undefined` for no content.
 * @param context - Shared render context (shop, locale, nesting depth).
 * @returns The rendered block sequence, or `null` when there is nothing to render.
 */
export const Blocks = ({ blocks, context }: BlocksProps): ReactNode => {
    if (!blocks) return null;
    const depth = context.depth ?? 0;
    if (depth >= MAX_BLOCK_DEPTH) return null;

    return blocks.map((block, idx) => {
        const key = `${depth}:${idx}`;

        if (!isBlockType(block.blockType)) {
            // Graceful degradation: unknown block types render as `null` (see
            // docblock above). Record the event for observability so ops can
            // see when a CMS document references a block type the renderer
            // doesn't know about.
            trace.getActiveSpan()?.addEvent('blocks.unknown_type', {
                'block.type': (block as BlockNode).blockType ?? '<missing>',
            });
            return null;
        }

        const entry = STOREFRONT_BLOCKS[block.blockType];
        return <Fragment key={key}>{entry.render({ block, context, index: idx, Renderer: Blocks })}</Fragment>;
    });
};

Blocks.displayName = 'Nordcom.Blocks';

/**
 * Skeleton variant of the dispatcher — same registry, each entry's
 * `renderSkeleton` routes to the corresponding `Block.Skeleton`. Use this when
 * the blocks array is already loaded but downstream content is still streaming,
 * or when an outer Suspense boundary needs an exactly-shaped fallback
 * (preferable to a generic page placeholder because the skeleton already
 * matches the editor-configured grid + item counts).
 *
 * Columns recurses with `Blocks.Skeleton` so a nested column of skeleton blocks
 * renders end-to-end as skeletons — without that the recursion would fall back
 * to live blocks inside a skeleton tree.
 *
 * @param blocks - The block nodes to render as placeholders, or `null`/`undefined`.
 * @param context - Shared render context (shop, locale, nesting depth).
 * @returns The skeleton block sequence, or `null` when there is nothing to render.
 */
const BlocksSkeleton = ({ blocks, context }: BlocksProps): ReactNode => {
    if (!blocks) return null;
    const depth = context.depth ?? 0;
    if (depth >= MAX_BLOCK_DEPTH) return null;

    return (
        <>
            {blocks.map((block, idx) => {
                if (!isBlockType(block.blockType)) return null;

                const entry = STOREFRONT_BLOCKS[block.blockType];
                return (
                    <Fragment key={idx}>
                        {entry.renderSkeleton({ block, context, index: idx, Renderer: BlocksSkeleton })}
                    </Fragment>
                );
            })}
        </>
    );
};
BlocksSkeleton.displayName = 'Nordcom.Blocks.Skeleton';
Blocks.Skeleton = BlocksSkeleton;

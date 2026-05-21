import { trace } from '@opentelemetry/api';
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

type BlocksProps = {
    blocks: BlockNode[] | null | undefined;
    context: BlockContext;
};

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
 * Unrecognized block types render as `null` rather than throwing,
 * matching the old SliceZone behavior — keeps editors from breaking
 * a live page by adding a block that ships before the renderer.
 */
export const Blocks = ({ blocks, context }: BlocksProps): ReactNode => {
    if (!blocks) return null;
    const depth = context.depth ?? 0;
    if (depth >= MAX_BLOCK_DEPTH) return null;

    return blocks.map((block, idx) => {
        const key = `${depth}:${idx}`;

        switch (block.blockType) {
            case 'alert':
                return <AlertBlock key={key} block={block} />;
            case 'banner':
                return <BannerBlock key={key} block={block} context={context} />;
            case 'collection':
                return <CollectionBlock key={key} block={block} context={context} index={idx} />;
            case 'columns':
                return <ColumnsBlock key={key} block={block} context={context} Renderer={Blocks} />;
            case 'html':
                return <HtmlBlock key={key} block={block} />;
            case 'media-grid':
                return <MediaGridBlock key={key} block={block} context={context} />;
            case 'overview':
                return <OverviewBlock key={key} block={block} context={context} />;
            case 'rich-text':
                return <RichTextBlock key={key} block={block} context={context} />;
            case 'vendors':
                return <VendorsBlock key={key} block={block} context={context} />;
            default: {
                // Graceful degradation: unknown block types render as `null`
                // (see docblock above). Record the event for observability so
                // ops can see when a CMS document references a block type the
                // renderer doesn't know about.
                trace.getActiveSpan()?.addEvent('blocks.unknown_type', {
                    'block.type': (block as BlockNode).blockType ?? '<missing>',
                });
                return null;
            }
        }
    });
};

Blocks.displayName = 'Nordcom.Blocks';

/**
 * Skeleton variant of the dispatcher — same switch shape, each branch
 * routes to the corresponding `Block.Skeleton`. Use this when the blocks
 * array is already loaded but downstream content is still streaming, or
 * when an outer Suspense boundary needs an exactly-shaped fallback
 * (preferable to a generic page placeholder because the skeleton already
 * matches the editor-configured grid + item counts).
 *
 * Columns recurses with `Blocks.Skeleton` so a nested column of skeleton
 * blocks renders end-to-end as skeletons — without that the recursion
 * would fall back to live blocks inside a skeleton tree.
 */
const BlocksSkeleton = ({ blocks, context }: BlocksProps): ReactNode => {
    if (!blocks) return null;
    const depth = context.depth ?? 0;
    if (depth >= MAX_BLOCK_DEPTH) return null;

    return (
        <>
            {blocks.map((block, idx) => {
                switch (block.blockType) {
                    case 'alert':
                        return <AlertBlock.Skeleton key={idx} block={block} />;
                    case 'banner':
                        return <BannerBlock.Skeleton key={idx} block={block} />;
                    case 'collection':
                        return <CollectionBlock.Skeleton key={idx} block={block} />;
                    case 'columns':
                        return (
                            <ColumnsBlock.Skeleton
                                key={idx}
                                block={block}
                                context={context}
                                Renderer={BlocksSkeleton}
                            />
                        );
                    case 'html':
                        return <HtmlBlock.Skeleton key={idx} block={block} />;
                    case 'media-grid':
                        return <MediaGridBlock.Skeleton key={idx} block={block} />;
                    case 'overview':
                        return <OverviewBlock.Skeleton key={idx} block={block} />;
                    case 'rich-text':
                        return <RichTextBlock.Skeleton key={idx} block={block} />;
                    case 'vendors':
                        return <VendorsBlock.Skeleton key={idx} block={block} />;
                    default:
                        return null;
                }
            })}
        </>
    );
};
BlocksSkeleton.displayName = 'Nordcom.Blocks.Skeleton';
Blocks.Skeleton = BlocksSkeleton;

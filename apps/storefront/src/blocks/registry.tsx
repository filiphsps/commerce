import type { BlockType } from '@nordcom/commerce-cms/blocks';
import type { ReactNode } from 'react';
import { AlertBlock } from './alert';
import { BannerBlock } from './banner';
import { CollectionBlock } from './collection';
import { ColumnsBlock } from './columns';
import type { BlockContext } from './context';
import { HtmlBlock } from './html';
import { MediaGridBlock } from './media-grid';
import { OverviewBlock } from './overview';
import { RichTextBlock } from './rich-text';
import type {
    AlertBlockNode,
    BannerBlockNode,
    BlockNode,
    CollectionBlockNode,
    ColumnsBlockNode,
    HtmlBlockNode,
    MediaGridBlockNode,
    OverviewBlockNode,
    RichTextBlockNode,
    VendorsBlockNode,
} from './types';
import { VendorsBlock } from './vendors';

/**
 * Recursive dispatcher injected into layout blocks (`columns`) so nested
 * content renders back through the same dispatcher. Injected rather than
 * imported to keep `registry.tsx` and `blocks.tsx` acyclic.
 */
export type BlockDispatcher = (props: { blocks: BlockNode[]; context: BlockContext }) => ReactNode;

/**
 * Uniform arguments handed to every storefront render entry. `block` is the
 * full union here; {@link defineBlock} binds each entry to its concrete node
 * type. `Renderer` is the live dispatcher for `render` and the skeleton
 * dispatcher for `renderSkeleton`, so `columns` recursion stays in the same
 * mode end-to-end.
 */
type StorefrontRenderArgs = {
    block: BlockNode;
    context: BlockContext;
    index: number;
    Renderer: BlockDispatcher;
};

/** A single entry in {@link STOREFRONT_BLOCKS}: live + skeleton renderers for one block type. */
export type StorefrontBlockEntry = {
    render: (args: StorefrontRenderArgs) => ReactNode;
    renderSkeleton: (args: StorefrontRenderArgs) => ReactNode;
};

/**
 * Binds live + skeleton render closures to a specific block node type. The
 * dispatcher only ever invokes an entry under its own `blockType` key, so
 * narrowing the incoming union node to `TBlock` is sound; the single
 * unavoidable cast is localized here instead of duplicated across every entry.
 *
 * @param render - Live renderer for the concrete `TBlock` node.
 * @param renderSkeleton - Loading-placeholder renderer for the same node.
 * @returns A type-erased {@link StorefrontBlockEntry} keyed into {@link STOREFRONT_BLOCKS}.
 */
function defineBlock<TBlock extends BlockNode>(
    render: (args: { block: TBlock; context: BlockContext; index: number; Renderer: BlockDispatcher }) => ReactNode,
    renderSkeleton: (args: {
        block: TBlock;
        context: BlockContext;
        index: number;
        Renderer: BlockDispatcher;
    }) => ReactNode,
): StorefrontBlockEntry {
    type NarrowedArgs = { block: TBlock; context: BlockContext; index: number; Renderer: BlockDispatcher };
    return {
        render: (args) => render(args as NarrowedArgs),
        renderSkeleton: (args) => renderSkeleton(args as NarrowedArgs),
    };
}

/**
 * Maps every {@link BlockType} to its storefront block component. This is the
 * single registration point for the live storefront renderer: `Record<BlockType,
 * …>` makes the mapping exhaustive, so a block type added to the shared CMS
 * registry forces a matching entry here. Component call shapes are preserved
 * verbatim from the previous hand-maintained dispatcher switch, so an
 * un-customized shop renders byte-identically.
 */
export const STOREFRONT_BLOCKS: Record<BlockType, StorefrontBlockEntry> = {
    alert: defineBlock<AlertBlockNode>(
        ({ block }) => <AlertBlock block={block} />,
        ({ block }) => <AlertBlock.Skeleton block={block} />,
    ),
    banner: defineBlock<BannerBlockNode>(
        ({ block, context }) => <BannerBlock block={block} context={context} />,
        ({ block }) => <BannerBlock.Skeleton block={block} />,
    ),
    collection: defineBlock<CollectionBlockNode>(
        ({ block, context, index }) => <CollectionBlock block={block} context={context} index={index} />,
        ({ block }) => <CollectionBlock.Skeleton block={block} />,
    ),
    columns: defineBlock<ColumnsBlockNode>(
        ({ block, context, Renderer }) => <ColumnsBlock block={block} context={context} Renderer={Renderer} />,
        ({ block, context, Renderer }) => <ColumnsBlock.Skeleton block={block} context={context} Renderer={Renderer} />,
    ),
    html: defineBlock<HtmlBlockNode>(
        ({ block }) => <HtmlBlock block={block} />,
        ({ block }) => <HtmlBlock.Skeleton block={block} />,
    ),
    'media-grid': defineBlock<MediaGridBlockNode>(
        ({ block, context }) => <MediaGridBlock block={block} context={context} />,
        ({ block }) => <MediaGridBlock.Skeleton block={block} />,
    ),
    overview: defineBlock<OverviewBlockNode>(
        ({ block, context }) => <OverviewBlock block={block} context={context} />,
        ({ block }) => <OverviewBlock.Skeleton block={block} />,
    ),
    'rich-text': defineBlock<RichTextBlockNode>(
        ({ block, context }) => <RichTextBlock block={block} context={context} />,
        ({ block }) => <RichTextBlock.Skeleton block={block} />,
    ),
    vendors: defineBlock<VendorsBlockNode>(
        ({ block, context }) => <VendorsBlock block={block} context={context} />,
        ({ block }) => <VendorsBlock.Skeleton block={block} />,
    ),
};

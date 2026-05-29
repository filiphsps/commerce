import type { ReactNode } from 'react';
import type { BlockType } from '../registry';
import { AlertBlock } from './AlertBlock';
import { BannerBlock } from './BannerBlock';
import { CollectionBlock } from './CollectionBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { HtmlBlock } from './HtmlBlock';
import { MediaGridBlock } from './MediaGridBlock';
import { OverviewBlock } from './OverviewBlock';
import { RichTextBlock } from './RichTextBlock';
import type {
    AlertBlockNode,
    BannerBlockNode,
    BlockNode,
    BlockRenderContext,
    CollectionBlockNode,
    ColumnsBlockNode,
    HtmlBlockNode,
    MediaGridBlockNode,
    OverviewBlockNode,
    RichTextBlockNode,
    VendorsBlockNode,
} from './types';
import { VendorsBlock } from './VendorsBlock';

/**
 * Recursive dispatcher passed to layout blocks (`columns`) so nested content
 * renders back through the same registry without `registry.tsx` importing the
 * dispatcher (which would form a cycle).
 */
export type CmsBlockDispatcher = (props: { blocks: BlockNode[]; context: BlockRenderContext }) => ReactNode;

/**
 * Uniform arguments handed to every CMS render entry. `block` is the full
 * union here; {@link defineBlock} binds each entry to its concrete node type.
 */
type CmsRenderArgs = { block: BlockNode; context: BlockRenderContext; Renderer: CmsBlockDispatcher };

/** A single entry in {@link CMS_BLOCKS}: renders one block node to the package's generic markup. */
export type CmsBlockEntry = { render: (args: CmsRenderArgs) => ReactNode };

/**
 * Binds a render closure to a specific block node type. The dispatcher only
 * ever invokes an entry under its own `blockType` key, so narrowing the
 * incoming union node to `TBlock` is sound; the single unavoidable cast is
 * localized here instead of duplicated across every entry.
 *
 * @param render - Closure rendering the concrete `TBlock` node to React markup.
 * @returns A type-erased {@link CmsBlockEntry} keyed into {@link CMS_BLOCKS}.
 */
function defineBlock<TBlock extends BlockNode>(
    render: (args: { block: TBlock; context: BlockRenderContext; Renderer: CmsBlockDispatcher }) => ReactNode,
): CmsBlockEntry {
    return {
        render: (args) => render(args as { block: TBlock; context: BlockRenderContext; Renderer: CmsBlockDispatcher }),
    };
}

/**
 * Maps every {@link BlockType} to the CMS package's generic render component.
 * `Record<BlockType, …>` makes the mapping exhaustive: a block type can't be
 * added to the shared registry without a matching entry here, which keeps this
 * dispatch surface in lockstep with the Payload definitions and the storefront
 * renderer.
 */
export const CMS_BLOCKS: Record<BlockType, CmsBlockEntry> = {
    'rich-text': defineBlock<RichTextBlockNode>(({ block }) => <RichTextBlock block={block} />),
    alert: defineBlock<AlertBlockNode>(({ block }) => <AlertBlock block={block} />),
    html: defineBlock<HtmlBlockNode>(({ block }) => <HtmlBlock block={block} />),
    'media-grid': defineBlock<MediaGridBlockNode>(({ block, context }) => (
        <MediaGridBlock block={block} context={context} />
    )),
    banner: defineBlock<BannerBlockNode>(({ block, context }) => <BannerBlock block={block} context={context} />),
    columns: defineBlock<ColumnsBlockNode>(({ block, context, Renderer }) => (
        <ColumnsBlock block={block} context={context} Renderer={Renderer} />
    )),
    collection: defineBlock<CollectionBlockNode>(({ block, context }) => (
        <CollectionBlock block={block} context={context} />
    )),
    vendors: defineBlock<VendorsBlockNode>(({ block, context }) => <VendorsBlock block={block} context={context} />),
    overview: defineBlock<OverviewBlockNode>(({ block, context }) => <OverviewBlock block={block} context={context} />),
};

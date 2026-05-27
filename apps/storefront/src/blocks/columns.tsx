import type { ReactNode } from 'react';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import type { BlockNode, ColumnsBlockNode } from './types';

/**
 * Renders the CMS Columns block — the recursion point in the block tree.
 *
 * Mirrors the old Prismic `Columns` slice's layout (responsive flex on
 * mobile, CSS grid at md+) but is otherwise data-driven: each column
 * carries a `width` enum and its own array of child blocks, which we
 * hand back to the dispatcher (passed in via `Renderer`) at one deeper
 * recursion depth.
 *
 * The dispatcher is injected instead of imported so we don't form a
 * cycle (`blocks.tsx` imports `columns.tsx`, `columns.tsx` would
 * otherwise import `blocks.tsx`). The depth guard lives in the
 * dispatcher; this component just bumps it.
 */
const WIDTH_TO_FRACTION: Record<ColumnsBlockNode['columns'][number]['width'], string> = {
    auto: '1fr',
    '1/3': '1fr',
    '1/2': '1fr',
    '2/3': '2fr',
    full: '1fr',
};

/**
 * Props for `ColumnsBlock` and `ColumnsBlockSkeleton`. The `Renderer` is
 * injected rather than imported to keep the block tree acyclic — the
 * dispatcher (`blocks.tsx`) owns the recursion guard and dispatches back here.
 */
export type ColumnsBlockProps = {
    block: ColumnsBlockNode;
    context: BlockContext;
    Renderer: (props: { blocks: BlockNode[]; context: BlockContext }) => ReactNode;
};

/**
 * Renders the CMS Columns block, laying out child blocks in a responsive
 * CSS grid where each column's track size is driven by its `width` enum.
 *
 * @param block - The CMS columns block node with column definitions and nested content.
 * @param context - Render context; depth is incremented before being forwarded to nested blocks.
 * @param Renderer - Injected block dispatcher used for recursion into nested block arrays.
 * @returns The rendered columns section element.
 */
export const ColumnsBlock = ({ block, context, Renderer }: ColumnsBlockProps) => {
    const nestedContext: BlockContext = { ...context, depth: (context.depth ?? 0) + 1 };

    // Build the grid track template from each column's `width` enum. The
    // editor can mix-and-match (e.g. `[1/3, 2/3]`) — the explicit fraction
    // mapping above preserves the editor's intent; the simpler "all 1fr"
    // approach the old Prismic columns used dropped the editor's chosen
    // ratio on the floor.
    const gridTemplateColumns = block.columns.map((c) => WIDTH_TO_FRACTION[c.width] ?? '1fr').join(' ');

    return (
        <section
            data-block-type="columns"
            data-columns={block.columns.length}
            className={cn('flex w-full flex-wrap gap-3 md:grid')}
            style={{ gridTemplateColumns }}
        >
            {block.columns.map((column, idx) => (
                <div
                    key={idx}
                    data-width={column.width}
                    className={cn('flex w-full min-w-18 flex-col gap-3', column.width === 'full' && 'md:col-span-full')}
                >
                    <Renderer blocks={column.content} context={nestedContext} />
                </div>
            ))}
        </section>
    );
};

ColumnsBlock.displayName = 'Nordcom.Blocks.Columns';

/**
 * Loading placeholder for the Columns block. Same grid template + column
 * count as the live block — the children render through whichever
 * `Renderer.Skeleton` the dispatcher hands in, so a `Blocks.Skeleton`
 * call recurses into nested skeleton blocks (e.g. a column of
 * [banner, rich-text] skeletons).
 *
 * Like the live block, the dispatcher is injected via `Renderer` so the
 * import graph stays acyclic between `columns.tsx` and `blocks.tsx`.
 *
 * @param block - The CMS columns block node; used to mirror grid structure and column count.
 * @param context - Render context; depth is incremented before being forwarded to nested skeleton blocks.
 * @param Renderer - Injected block dispatcher for recursing into nested skeleton block arrays.
 * @returns The skeleton columns section element.
 */
const ColumnsBlockSkeleton = ({ block, context, Renderer }: ColumnsBlockProps) => {
    const nestedContext: BlockContext = { ...context, depth: (context.depth ?? 0) + 1 };
    const gridTemplateColumns = block.columns.map((c) => WIDTH_TO_FRACTION[c.width] ?? '1fr').join(' ');
    return (
        <section
            data-block-type="columns"
            data-columns={block.columns.length}
            data-skeleton-variant="columns"
            className={cn('flex w-full flex-wrap gap-3 md:grid')}
            style={{ gridTemplateColumns }}
        >
            {block.columns.map((column, idx) => (
                <div
                    key={idx}
                    data-width={column.width}
                    className={cn('flex w-full min-w-18 flex-col gap-3', column.width === 'full' && 'md:col-span-full')}
                >
                    <Renderer blocks={column.content} context={nestedContext} />
                </div>
            ))}
        </section>
    );
};
ColumnsBlockSkeleton.displayName = 'Nordcom.Blocks.Columns.Skeleton';
ColumnsBlock.Skeleton = ColumnsBlockSkeleton;

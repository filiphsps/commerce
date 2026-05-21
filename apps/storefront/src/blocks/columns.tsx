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

export type ColumnsBlockProps = {
    block: ColumnsBlockNode;
    context: BlockContext;
    Renderer: (props: { blocks: BlockNode[]; context: BlockContext }) => ReactNode;
};

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

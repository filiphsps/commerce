import type { ReactNode } from 'react';
import type { BlockRenderContext, ColumnsBlockNode } from './types';

/**
 * Renders a {@link ColumnsBlockNode} as a flex/grid column layout. Accepts an
 * injected `Renderer` so `BlockRenderer` can pass itself in and achieve
 * recursive rendering without a circular import.
 *
 * @param block - The columns block node with its column array.
 * @param context - Block render context; nesting depth is incremented per call.
 * @param Renderer - The parent block renderer used for nested block arrays.
 * @returns A React div containing one child div per column.
 */
export function ColumnsBlock({
    block,
    context,
    Renderer,
}: {
    block: ColumnsBlockNode;
    context: BlockRenderContext;
    Renderer: (props: {
        blocks: ColumnsBlockNode['columns'][number]['content'];
        context: BlockRenderContext;
    }) => ReactNode;
}) {
    const nestedContext: BlockRenderContext = { ...context, depth: (context.depth ?? 0) + 1 };
    return (
        <div className="cms-columns" data-columns={block.columns.length}>
            {block.columns.map((col, idx) => (
                <div key={idx} className="cms-columns__col" data-width={col.width}>
                    <Renderer blocks={col.content} context={nestedContext} />
                </div>
            ))}
        </div>
    );
}

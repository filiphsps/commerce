import type { ReactNode } from 'react';
import type { BlockRenderContext, ColumnsBlockNode } from './types';

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

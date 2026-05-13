import type { BlockRenderContext, OverviewBlockNode } from './types';

export async function OverviewBlock({
    block,
    context,
}: {
    block: OverviewBlockNode;
    context: BlockRenderContext;
}) {
    const products = await context.loaders.loadOverview({
        shop: context.shop,
        locale: context.locale,
        source: block.source,
        handle: block.collectionHandle,
        limit: block.limit,
    });
    if (products.length === 0) return null;
    return (
        <section className={`cms-overview cms-overview--${block.source}`}>
            {block.title ? <h2>{block.title}</h2> : null}
            <ul>
                {products.map((p) => (
                    <li key={p.handle}>{p.title}</li>
                ))}
            </ul>
        </section>
    );
}

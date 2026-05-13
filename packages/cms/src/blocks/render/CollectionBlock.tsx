import type { BlockRenderContext, CollectionBlockNode } from './types';

export async function CollectionBlock({
    block,
    context,
}: {
    block: CollectionBlockNode;
    context: BlockRenderContext;
}) {
    const collection = await context.loaders.loadCollection({
        shop: context.shop,
        locale: context.locale,
        handle: block.handle,
        limit: block.limit,
    });
    if (!collection) return null;
    return (
        <section className={`cms-collection cms-collection--${block.layout}`}>
            {block.title ? <h2>{block.title}</h2> : <h2>{collection.title}</h2>}
            <ul>
                {collection.products.map((p) => (
                    <li key={p.handle}>{p.title}</li>
                ))}
            </ul>
        </section>
    );
}

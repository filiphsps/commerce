import type { BlockRenderContext, CollectionBlockNode } from './types';

/**
 * Async Server Component that loads a Shopify collection via the block render
 * context loaders and renders a simple product list. Returns `null` when the
 * collection cannot be resolved.
 *
 * @param block - The collection block node with handle, layout, and limit.
 * @param context - Block render context supplying the shop, locale, and loaders.
 * @returns A React section element with the product list, or `null`.
 */
export async function CollectionBlock({ block, context }: { block: CollectionBlockNode; context: BlockRenderContext }) {
    const collection = await context.loaders.loadCollection({
        shop: context.shop,
        locale: context.locale,
        handle: block.handle,
        limit: block.limit,
    });
    if (!collection) return null;
    const layout = typeof block.layout === 'string' ? block.layout : (block.layout?.base ?? 'grid');
    return (
        <section className={`cms-collection cms-collection--${layout}`}>
            {block.title ? <h2>{block.title}</h2> : <h2>{collection.title}</h2>}
            <ul>
                {collection.products.map((p) => (
                    <li key={p.handle}>{p.title}</li>
                ))}
            </ul>
        </section>
    );
}

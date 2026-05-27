import type { BlockRenderContext, OverviewBlockNode } from './types';

/**
 * Async Server Component that loads a product overview (by collection handle,
 * latest, or featured) via the block render context loaders and renders a list.
 * Returns `null` when the loader returns no products.
 *
 * @param block - The overview block node with source, handle, and limit.
 * @param context - Block render context supplying the shop, locale, and loaders.
 * @returns A React section with the product list, or `null`.
 */
export async function OverviewBlock({ block, context }: { block: OverviewBlockNode; context: BlockRenderContext }) {
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

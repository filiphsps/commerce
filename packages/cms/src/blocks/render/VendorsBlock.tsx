import type { BlockRenderContext, VendorsBlockNode } from './types';

/**
 * Async Server Component that loads unique vendor names from Shopify via the
 * block render context loaders and renders a summary list. Returns `null` when
 * no vendors are available.
 *
 * @param block - The vendors block node with title and max vendor count.
 * @param context - Block render context supplying the shop, locale, and loaders.
 * @returns A React section with the vendor list, or `null`.
 */
export async function VendorsBlock({ block, context }: { block: VendorsBlockNode; context: BlockRenderContext }) {
    const vendors = await context.loaders.loadVendors({
        shop: context.shop,
        locale: context.locale,
        limit: block.maxVendors,
    });
    if (vendors.length === 0) return null;
    return (
        <section className="cms-vendors">
            {block.title ? <h2>{block.title}</h2> : null}
            <ul>
                {vendors.map((v) => (
                    <li key={v.name}>
                        {v.name} <small>({v.productCount})</small>
                    </li>
                ))}
            </ul>
        </section>
    );
}

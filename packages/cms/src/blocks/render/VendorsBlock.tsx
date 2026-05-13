import type { BlockRenderContext, VendorsBlockNode } from './types';

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

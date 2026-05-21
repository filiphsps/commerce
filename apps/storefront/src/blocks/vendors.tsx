import 'server-only';

import Vendors from '@/components/informational/vendors';
import { Title } from '@/components/typography/heading';
import type { BlockContext } from './context';
import type { VendorsBlockNode } from './types';

/**
 * Renders the CMS Vendors block. Mirrors the old Prismic `Vendors` slice —
 * the section keeps the same horizontal-scroll-on-mobile / auto-fit grid
 * layout, while the actual vendor list is loaded by the shared `Vendors`
 * informational component (which hits Shopify).
 *
 * `maxVendors` from the schema is currently advisory — the underlying
 * `VendorsApi` returns whatever Shopify exposes; if we need a hard cap
 * we can wire it through there.
 */
export const VendorsBlock = ({ block, context }: { block: VendorsBlockNode; context: BlockContext }) => {
    return (
        <section data-block-type="vendors" className="flex w-full flex-col gap-3">
            {block.title ? (
                <Title as="h2" className="font-bold text-xl leading-tight lg:text-2xl">
                    {block.title}
                </Title>
            ) : null}
            <div className="overflow-x-shadow -my-2 -ml-2 flex w-screen min-w-screen flex-nowrap gap-2 overflow-x-auto p-2 md:-mx-0 md:-my-0 md:grid md:w-full md:grid-cols-[repeat(auto-fit,minmax(min(8rem,100%),1fr))] md:overflow-x-hidden md:px-0 md:py-0">
                <Vendors shop={context.shop} locale={context.locale} />
            </div>
        </section>
    );
};

VendorsBlock.displayName = 'Nordcom.Blocks.Vendors';

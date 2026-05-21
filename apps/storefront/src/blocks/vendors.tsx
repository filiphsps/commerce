import 'server-only';

import { Suspense } from 'react';
import Vendors from '@/components/informational/vendors';
import { Title } from '@/components/typography/heading';
import type { BlockContext } from './context';
import type { VendorsBlockNode } from './types';

// Shared rail wrapper used by both the live block and its skeleton so the
// horizontal-scroll layout never drifts between the two.
const VENDOR_RAIL_CLASS =
    'overflow-x-shadow -my-2 -ml-2 flex w-screen min-w-screen flex-nowrap gap-2 overflow-x-auto p-2 md:mx-0 md:my-0 md:grid md:w-full md:grid-cols-[repeat(auto-fit,minmax(min(8rem,100%),1fr))] md:overflow-x-hidden md:px-0 md:py-0';

const VendorRailSkeleton = ({ count = 8 }: { count?: number }) => (
    <div className={VENDOR_RAIL_CLASS}>
        {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="h-10 min-w-32 shrink-0 rounded-lg md:h-12 md:min-w-0" data-skeleton />
        ))}
    </div>
);

/**
 * Renders the CMS Vendors block. Mirrors the old Prismic `Vendors` slice —
 * the section keeps the same horizontal-scroll-on-mobile / auto-fit grid
 * layout, while the actual vendor list is loaded by the shared `Vendors`
 * informational component (which hits Shopify).
 *
 * `maxVendors` from the schema is currently advisory — the underlying
 * `VendorsApi` returns whatever Shopify exposes; if we need a hard cap
 * we can wire it through there.
 *
 * The inner `Vendors` fetcher is wrapped in `Suspense` so the title +
 * surrounding blocks paint immediately and the vendor pills stream in
 * with the skeleton acting as a placeholder.
 */
export const VendorsBlock = ({ block, context }: { block: VendorsBlockNode; context: BlockContext }) => {
    return (
        <section data-block-type="vendors" className="flex w-full flex-col gap-3">
            {block.title ? (
                <Title as="h2" className="font-bold text-xl leading-tight lg:text-2xl">
                    {block.title}
                </Title>
            ) : null}
            <Suspense fallback={<VendorRailSkeleton count={Math.min(block.maxVendors ?? 8, 12)} />}>
                <div className={VENDOR_RAIL_CLASS}>
                    <Vendors shop={context.shop} locale={context.locale} />
                </div>
            </Suspense>
        </section>
    );
};

VendorsBlock.displayName = 'Nordcom.Blocks.Vendors';

/**
 * Loading placeholder for the Vendors block. Title slot mirrors the
 * editor-set value; the rail uses the same scroll layout with chip-sized
 * skeletons so the row height is stable when the real data arrives.
 */
const VendorsBlockSkeleton = ({ block }: { block: VendorsBlockNode }) => {
    return (
        <section data-block-type="vendors" data-skeleton-variant="vendors" className="flex w-full flex-col gap-3">
            {block.title ? <div className="h-7 w-48 rounded-sm lg:h-8" data-skeleton /> : null}
            <VendorRailSkeleton count={Math.min(block.maxVendors ?? 8, 12)} />
        </section>
    );
};
VendorsBlockSkeleton.displayName = 'Nordcom.Blocks.Vendors.Skeleton';
VendorsBlock.Skeleton = VendorsBlockSkeleton;

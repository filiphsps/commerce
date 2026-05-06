import 'server-only';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import Vendors from '@/components/informational/vendors';

/**
 * Props for `Vendors`.
 */
export type VendorsProps = SliceComponentProps<Content.VendorsSlice, any>;

/**
 * Component for "Vendors" Slices.
 */
const VendorsSlice = async ({ slice, context: { shop, locale } }: VendorsProps) => {
    return (
        <section
            className="overflow-x-shadow -my-2 -ml-2 flex w-screen min-w-screen flex-nowrap gap-2 overflow-x-auto p-2 md:-mx-0 md:-my-0 md:grid md:w-full md:grid-cols-[repeat(auto-fit,minmax(min(8rem,100%),1fr))] md:overflow-x-hidden md:px-0 md:py-0"
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            <Vendors shop={shop} locale={locale} />
        </section>
    );
};

VendorsSlice.displayName = 'Nordcom.Slices.Vendors';
export default VendorsSlice;

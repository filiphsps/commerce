import 'server-only';

import type { Shop } from '@nordcom/commerce-database';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { VendorsApi } from '@/api/shopify/vendor';
import { cn } from '@/utils/tailwind';

import Link from '@/components/link';

import type { VendorModel } from '@/models/VendorModel';
import type { Locale } from '@/utils/locale';

export type VendorsProps = {
    shop: Shop;
    locale: Locale;

    className?: string | undefined;
};
const Vendors = async ({ shop, locale, className, ...props }: VendorsProps) => {
    const api = await ShopifyApolloApiClient({ shop, locale });

    const vendors = await VendorsApi({ api });

    return vendors.map((vendor: VendorModel) => {
        if (!vendor.handle) return null;

        return (
            <Link
                key={vendor.handle}
                // TODO: Figure out if we should link to the collection or a filtered product list.
                href={`/collections/${vendor.handle}/`}
                {...props}
                className={cn(
                    'bg-secondary-light hover:bg-primary hover:text-primary-foreground mr-2 flex items-center justify-center rounded-xl p-2 text-sm font-semibold transition-colors md:mr-0',
                    className
                )}
            >
                {vendor.title}
            </Link>
        );
    });
};

Vendors.skeleton = () => (
    <>
        <div className="w-12 rounded-xl p-2" data-skeleton />
        <div className="w-12 rounded-xl p-2" data-skeleton />
        <div className="w-12 rounded-xl p-2" data-skeleton />
        <div className="w-12 rounded-xl p-2" data-skeleton />
    </>
);

Vendors.displayName = 'Nordcom.Vendors';
export default Vendors;

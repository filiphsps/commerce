import 'server-only';

import { type OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { VendorsApi } from '@/api/shopify/vendor';
import { cn } from '@/utils/tailwind';

import Link from '@/components/link';

import type { VendorModel } from '@/models/VendorModel';
import type { Locale } from '@/utils/locale';

export type VendorsProps = {
    shop: OnlineShop;
    locale: Locale;

    className?: string | undefined;
};
const Vendors = async ({ shop, locale, className, ...props }: VendorsProps) => {
    const api = await ShopifyApolloApiClient({ shop, locale });

    const vendors = await VendorsApi({ api });
    if (vendors.length <= 0) {
        return null;
    }

    return vendors.map((vendor: VendorModel) => (
        <Link
            key={vendor.handle}
            // TODO: Figure out if we should link to the collection or a filtered product list.
            href={`/collections/${vendor.handle}/`}
            {...props}
            className={cn(
                'bg-secondary-light hover:bg-primary hover:text-primary-foreground flex items-center justify-center whitespace-nowrap rounded-lg p-2 px-3 text-center text-sm font-semibold leading-tight transition-colors md:mr-0 md:whitespace-normal md:px-3',
                className
            )}
        >
            {vendor.title}
        </Link>
    ));
};

Vendors.skeleton = () => (
    <>
        <div className="w-12 rounded-lg p-2" data-skeleton />
        <div className="w-12 rounded-lg p-2" data-skeleton />
        <div className="w-12 rounded-lg p-2" data-skeleton />
        <div className="w-12 rounded-lg p-2" data-skeleton />
    </>
);

Vendors.displayName = 'Nordcom.Vendors';
export default Vendors;

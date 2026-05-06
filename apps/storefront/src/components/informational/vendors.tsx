import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { VendorsApi } from '@/api/shopify/vendor';
import Link from '@/components/link';
import type { VendorModel } from '@/models/VendorModel';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

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
            {...props}
            // TODO: Figure out if we should link to the collection or a filtered product list.
            href={`/collections/${vendor.handle}/`}
            className={cn(
                'flex items-center justify-center whitespace-nowrap rounded-lg bg-secondary-light p-2 px-3 text-center font-semibold text-sm leading-tight transition-colors hover:bg-primary hover:text-primary-foreground md:mr-0 md:whitespace-normal md:px-3',
                className,
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

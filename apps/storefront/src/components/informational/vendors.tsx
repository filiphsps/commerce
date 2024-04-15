import 'server-only';

import styles from '@/components/informational/vendors.module.scss';

import type { Shop } from '@nordcom/commerce-database';

import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { VendorsApi } from '@/api/shopify/vendor';

import Link from '@/components/link';

import type { VendorModel } from '@/models/VendorModel';
import type { Locale } from '@/utils/locale';

export type VendorsProps = {
    shop: Shop;
    locale: Locale;

    className?: string | undefined;
};
const Vendors = async ({ shop, locale, className, ...props }: VendorsProps) => {
    const apiConfig = await ShopifyApiConfig({ shop });
    const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });

    const vendors = await VendorsApi({ api });

    return vendors.map((vendor: VendorModel) => {
        if (!vendor.handle) return null;

        return (
            <Link
                key={vendor.handle}
                // TODO: Figure out if we should link to the collection or a filtered product list.
                href={`/collections/${vendor.handle}/`}
                {...props}
                className={`${styles.vendor}${className ? ` ${className}` : ''}`}
            >
                {vendor.title}
            </Link>
        );
    });
};

Vendors.skeleton = () => (
    <div className={styles.container} data-skeleton>
        <div className={styles.vendor} />
        <div className={styles.vendor} />
        <div className={styles.vendor} />
        <div className={styles.vendor} />
    </div>
);

Vendors.displayName = 'Nordcom.Vendors';
export default Vendors;

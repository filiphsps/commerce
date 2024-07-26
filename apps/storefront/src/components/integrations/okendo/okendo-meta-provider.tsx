import Script from 'next/script';

import type { OnlineShop } from '@nordcom/commerce-db';

export type OkendoMetaProviderProps = {
    shop: OnlineShop;
};
export const OkendoMetaProvider = ({ shop }: OkendoMetaProviderProps) => {
    if (!shop.integrations.okendo) return null;

    const { subscriberId } = shop.integrations.okendo;
    return (
        <>
            <meta name="oke:subscriber_id" content={subscriberId} />
            <Script src="https://cdn-static.okendo.io/reviews-widget-plus/js/okendo-reviews.js" async defer />
        </>
    );
};

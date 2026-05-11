import type { OnlineShop } from '@nordcom/commerce-db';
import { PageApi } from '@/api/page';
import type { PageType } from '@/api/prismic/page';
import PrismicPage from '@/components/cms/prismic-page';
import ShopifyPage from '@/components/cms/shopify-page';
import type { Locale } from '@/utils/locale';

export type CMSContentProps = {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    type?: string;
};

export const CMSContent = async ({ shop, locale, handle, type }: CMSContentProps) => {
    const page = await PageApi({ shop, locale, handle, type });
    if (!page) return null;

    switch (page.provider) {
        case 'prismic':
            return (
                <PrismicPage
                    shop={shop}
                    locale={locale}
                    handle={handle}
                    page={page.data}
                    type={(type as PageType) ?? 'custom_page'}
                />
            );
        case 'shopify':
            return <ShopifyPage page={page.data} />;
    }
};

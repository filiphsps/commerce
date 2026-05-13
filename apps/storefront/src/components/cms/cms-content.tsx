import type { BlockNode } from '@nordcom/commerce-cms/blocks/render';
import { BlockRenderer } from '@nordcom/commerce-cms/blocks/render';
import type { OnlineShop } from '@nordcom/commerce-db';
import { PageApi } from '@/api/page';
import ShopifyPage from '@/components/cms/shopify-page';
import type { Locale } from '@/utils/locale';
import { buildBlockLoaders } from '../../cms-loaders';

export type CMSContentProps = {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    /** @deprecated Retained for source compatibility. */
    type?: string;
};

export const CMSContent = async ({ shop, locale, handle }: CMSContentProps) => {
    const page = await PageApi({ shop, locale, handle });
    if (!page) return null;

    switch (page.provider) {
        case 'cms': {
            const blocks = ((page.data as { blocks?: BlockNode[] }).blocks ?? []) as BlockNode[];
            return (
                <BlockRenderer
                    blocks={blocks}
                    context={{
                        shop: { id: shop.id, domain: shop.domain },
                        locale: { code: locale.code },
                        loaders: buildBlockLoaders(),
                    }}
                />
            );
        }
        case 'shopify':
            return <ShopifyPage page={page.data} />;
    }
};

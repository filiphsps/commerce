import { BlockRenderer } from '@nordcom/commerce-cms/blocks/render';
import type { OnlineShop } from '@nordcom/commerce-db';
import { notFound } from 'next/navigation';
import { PageApi } from '@/api/page';
import type { Locale } from '@/utils/locale';
import { buildBlockLoaders } from '../../cms-loaders';

export type CMSContentProps = {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
};

export const CMSContent = async ({ shop, locale, handle }: CMSContentProps) => {
    const page = await PageApi({ shop, locale, handle });
    if (!page) {
        notFound();
    }

    return (
        <BlockRenderer
            blocks={(page.blocks || []) as never}
            context={{
                shop: { id: shop.id, domain: shop.domain },
                locale: { code: locale.code },
                loaders: buildBlockLoaders(),
            }}
        />
    );
};

CMSContent.Skeleton = async ({}: CMSContentProps) => {
    // TODO
    return null;
};

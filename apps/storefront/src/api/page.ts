import type { OnlineShop } from '@nordcom/commerce-db';
import { TodoError } from '@nordcom/commerce-errors';

import { PageApi as PrismicPageApi, PagesApi as PrismicPagesApi } from '@/api/prismic/page';

import type { PageType } from '@/api/prismic/page';
import type { Locale } from '@/utils/locale';

export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    switch (shop.contentProvider.type) {
        case 'prismic':
            return PrismicPagesApi({ shop, locale });
    }

    throw new TodoError();
}
/**
 * @todo Generalize api helpers.
 */
export async function PageApi({
    shop,
    locale,
    handle,
    type
}: {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    type?: string;
}) {
    switch (shop.contentProvider.type) {
        case 'prismic':
            return PrismicPageApi({ shop, locale, handle, type: type as PageType });
    }

    throw new TodoError();
}

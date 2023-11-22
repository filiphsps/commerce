import { PageApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { NextLocaleToLocale, useTranslation } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';
import CartContent from './cart-content';

/* c8 ignore start */
export type CartPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: CartPageParams;
}): Promise<Metadata> {
    const shop = await ShopApi({ domain });
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;
    const handle = 'cart';

    const api = await StorefrontApiClient({ shop, locale });
    const store = await StoreApi({ api, locale });
    const locales = store.i18n.locales;
    const { page } = await PageApi({ shop, locale, handle, type: 'custom_page' });
    const i18n = await getDictionary(locale);
    const { t } = useTranslation('common', i18n);

    const title = page?.meta_title || page?.title || t('cart');
    const description: string | undefined =
        (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${domain}/${locale.locale}/${handle}/`,
            languages: locales.reduce(
                (prev, { locale }) => ({
                    ...prev,
                    [locale]: `https://${domain}/${locale}/${handle}/`
                }),
                {}
            )
        },
        openGraph: {
            url: `/${handle}/`,
            type: 'website',
            title,
            description,
            siteName: store?.name,
            locale: locale.locale,
            images:
                (page?.meta_image && [
                    {
                        url: page?.meta_image!.url as string,
                        width: page?.meta_image!.dimensions?.width || 0,
                        height: page?.meta_image!.dimensions?.height || 0,
                        alt: page?.meta_image!.alt || '',
                        secureUrl: page?.meta_image!.url as string
                    }
                ]) ||
                undefined
        }
    };
}
/* c8 ignore stop */

export default async function CartPage({ params: { domain, locale: localeData } }: { params: CartPageParams }) {
    const shop = await ShopApi({ domain });
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);
    const handle = 'cart';

    const api = await StorefrontApiClient({ shop, locale });
    const store = await StoreApi({ api, locale });
    const { page } = await PageApi({ shop, locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ api, page }))) || null;

    return (
        <Page>
            <PageContent primary>
                <CartContent
                    shop={shop}
                    locale={locale}
                    header={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--block-spacer-small)' }}>
                            <Heading title={page?.title} subtitle={page?.description} />
                        </div>
                    }
                    slices={
                        page ? (
                            <PrismicPage
                                shop={shop}
                                store={store}
                                locale={locale}
                                page={page}
                                prefetch={prefetch}
                                i18n={i18n}
                                handle={handle}
                                type={'custom_page'}
                            />
                        ) : null
                    }
                    i18n={i18n}
                />
            </PageContent>
        </Page>
    );
}

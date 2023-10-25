import { PageApi } from '@/api/page';
import { StoreApi } from '@/api/store';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { getDictionary } from '@/i18n/dictionarie';
import { components as slices } from '@/slices';
import { Prefetch } from '@/utils/Prefetch';
import { Config } from '@/utils/config';
import { NextLocaleToLocale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { SliceZone } from '@prismicio/react';
import { Suspense } from 'react';
import CartContent from './cart-content';

export async function generateMetadata({ params }: { params: { locale: string } }) {
    const { locale: localeData } = params;
    const handle = 'cart';
    const locale = NextLocaleToLocale(localeData);
    const locales = Config.i18n.locales;

    const store = await StoreApi({ locale });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });

    return {
        title: page?.meta_title || page?.title || 'Cart', // FIXME: i18n fallback
        description: (page?.meta_description && asText(page?.meta_description)) || page?.description! || '',
        alternates: {
            canonical: `https://${Config.domain}/cart/`,
            languages: locales.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr]: `https://${Config.domain}/${curr}/cart/`
                }),
                {}
            )
        },
        openGraph: {
            url: `https://${Config.domain}${locale.locale}/cart/`,
            type: 'website',
            title: page?.meta_title || page?.title!,
            description: (page?.meta_description && asText(page.meta_description)) || page?.description || '',
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

export async function generateStaticParams() {
    return Config.i18n.locales.map((locale) => ({ locale: locale }));
}

export type CartPageParams = { locale: string };
export default async function SearchPage({ params }: { params: CartPageParams }) {
    const locale = NextLocaleToLocale(params.locale);
    const i18n = await getDictionary(locale);
    const handle = 'cart';

    const store = await StoreApi({ locale });

    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch(page, locale.locale))) || null;

    return (
        <Page>
            <PageContent primary>
                <PageHeader title={page?.title} subtitle={page?.description} />

                <Suspense>
                    <CartContent
                        store={store}
                        slices={
                            <SliceZone slices={page?.slices} components={slices} context={{ store, prefetch, i18n }} />
                        }
                        i18n={i18n}
                    />
                </Suspense>
            </PageContent>
        </Page>
    );
}

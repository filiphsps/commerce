import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';

export type CustomPageParams = { domain: string; locale: string; uid: string[] };

export async function generateMetadata({
    params: { domain, locale: localeData, uid }
}: {
    params: CustomPageParams;
}): Promise<Metadata> {
    const handle = (uid && Array.isArray(uid) && uid.join('/')) || 'homepage';
    if (!isValidHandle(handle)) return notFoundMetadata;

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    try {
        const store = await StoreApi({ locale, api: StorefrontApiClient({ domain, locale }) });
        const locales = store.i18n.locales;

        const { page } = await PageApi({ locale, handle, type: 'custom_page' });
        if (!page) return notFoundMetadata;

        return {
            title: page.meta_title || page.title,
            description: asText(page.meta_description) || page.description || '',
            alternates: {
                canonical: `https://${domain}/${locale.locale}/${handle}/`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${domain}/${locale}/${handle}/`
                    }),
                    {}
                )
            }
            // TODO: Metadata.
        };
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export default async function CustomPage({
    params: { domain, locale: localeData, uid }
}: {
    params: CustomPageParams;
}) {
    const handle = (uid && Array.isArray(uid) && uid.join('/')) || 'homepage';
    if (!isValidHandle(handle)) return notFound();

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();

    try {
        const i18n = await getDictionary(locale);
        const client = StorefrontApiClient({ domain, locale });
        const store = await StoreApi({ locale, api: client });

        const { page } = await PageApi({ locale, handle, type: 'custom_page' });

        if (!page) return notFound(); // TODO: Return proper error.
        const prefetch = (page && (await Prefetch({ client, page }))) || null;

        return (
            <Page>
                <PageContent primary>
                    {page?.slices && page?.slices.length > 0 && (
                        <PrismicPage
                            store={store}
                            locale={locale}
                            page={page}
                            prefetch={prefetch}
                            i18n={i18n}
                            handle={handle}
                            type={'custom_page'}
                        />
                    )}
                </PageContent>
            </Page>
        );
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        throw error;
    }
}

export const revalidate = 120;

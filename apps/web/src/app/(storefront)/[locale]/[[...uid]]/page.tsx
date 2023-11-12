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
import { RedirectToLocale } from '../util';

export async function generateMetadata({ params }: { params: { locale: string; uid: string[] } }): Promise<Metadata> {
    const { locale: localeData, uid } = params;
    if (!isValidHandle(uid)) return notFoundMetadata;

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    try {
        const handle = (uid && Array.isArray(uid) && uid.join('/')) || 'homepage';
        const { page } = await PageApi({ locale, handle, type: 'custom_page' });
        if (!page) return notFoundMetadata;

        return {
            title: page.meta_title || page.title,
            description: asText(page.meta_description) || page.description || ''
            // TODO: Metadata.
        };
    } catch (error: any) {
        const message = (error.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export default async function CustomPage({ params }: { params: { locale: string; uid: string[] } }) {
    const { locale: localeData, uid } = params;
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return RedirectToLocale({ handle: [localeData, ...(uid || [])] });
    const i18n = await getDictionary(locale);

    const handle = (uid && Array.isArray(uid) && uid.join('/')) || 'homepage';
    if (!isValidHandle(handle)) return notFound();

    try {
        const client = StorefrontApiClient({ locale });
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
        if (error.message?.includes('No documents')) {
            console.warn(error);
            return notFound();
        }

        console.error(error);
        return notFound(); // FIXME: Return proper error.
    }
}

export const revalidate = 120;

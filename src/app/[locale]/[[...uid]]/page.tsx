import { NextLocaleToLocale } from '@/utils/locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import { Prefetch } from '@/utils/prefetch';
import PrismicPage from '@/components/prismic-page';
import { StoreApi } from '@/api/store';
import { StorefrontApiClient } from '@/api/shopify';
import { Suspense } from 'react';
import { getDictionary } from '@/i18n/dictionarie';
import { isValidHandle } from '@/utils/handle';
import { notFound } from 'next/navigation';

export default async function CustomPage({ params }: { params: { locale: string; uid: string[] } }) {
    const { locale: localeData, uid } = params;
    const locale = NextLocaleToLocale(localeData);
    const i18n = await getDictionary(locale);

    const handle = (uid && Array.isArray(uid) && uid.join('/')) || 'homepage';
    if (!isValidHandle(handle)) return notFound();

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, shopify: client });

    try {
        const { page } = await PageApi({ locale, handle, type: 'custom_page' });

        if (!page) return notFound(); // TODO: Return proper error
        const prefetch = (page && (await Prefetch({ client, page }))) || null;

        return (
            <Page>
                <PageContent primary>
                    <Suspense>
                        <PrismicPage
                            store={store}
                            locale={locale}
                            page={page}
                            prefetch={prefetch}
                            i18n={i18n}
                            handle={handle}
                            type={'custom_page'}
                        />
                    </Suspense>
                </PageContent>
            </Page>
        );
    } catch (error: any) {
        if (error.message?.includes('No documents')) {
            console.warn(error);
            return notFound();
        }

        console.error(error);
        return notFound(); // FIXME: Return proper error
    }
}

export const revalidate = 300; // 5 minutes.

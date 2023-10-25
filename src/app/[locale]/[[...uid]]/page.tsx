import { PageApi } from '@/api/page';
import { StoreApi } from '@/api/store';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import { getDictionary } from '@/i18n/dictionarie';
import { Prefetch } from '@/utils/Prefetch';
import { isValidHandle } from '@/utils/handle';
import { NextLocaleToLocale } from '@/utils/locale';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

export default async function CustomPage({ params }: { params: { locale: string; uid: string[] } }) {
    const { locale: localeData, uid } = params;
    const locale = NextLocaleToLocale(localeData);
    const i18n = await getDictionary(locale);

    const handle = (uid && Array.isArray(uid) && uid.join('/')) || 'homepage';
    if (!isValidHandle(handle)) return notFound();

    const store = await StoreApi({ locale });

    try {
        const { page } = await PageApi({ locale, handle, type: 'custom_page' });

        if (!page) return notFound(); // TODO: Return proper error
        const prefetch = (page && (await Prefetch(page, locale))) || null;

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

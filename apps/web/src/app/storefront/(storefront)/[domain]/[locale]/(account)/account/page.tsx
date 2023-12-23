import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { getAuthSession } from '@/auth';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../not-found';

// Make sure this page is always dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type AccountPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: AccountPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return notFoundMetadata;

        const shop = await ShopApi(domain);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const store = await StoreApi({ api });
        const locales = store.i18n?.locales || [Locale.default];

        return {
            title: 'Account',
            alternates: {
                canonical: `https://${domain}/${locale.code}/account/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${domain}/${code}/account/`
                    }),
                    {}
                )
            },
            robots: {
                follow: false,
                index: false
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export default async function AccountPage({ params: { domain, locale: localeData } }: { params: AccountPageParams }) {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const shop = await ShopApi(domain);

        const session = await getAuthSession(shop);
        if (!session) {
            return redirect(`/${locale.code}/account/login/`);
        }

        return (
            <>
                <PageContent>
                    <Heading title={`Hi ${session.user?.name || 'there'}!`} subtitle={null} />
                </PageContent>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}

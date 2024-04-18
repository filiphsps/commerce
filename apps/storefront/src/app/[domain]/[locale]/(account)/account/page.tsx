import { unstable_cache as cache } from 'next/cache';
import { notFound, redirect } from 'next/navigation';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { getAuthSession } from '@/auth';
import { Locale } from '@/utils/locale';

import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';

import type { Metadata } from 'next';

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
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);

        const api = await ShopifyApiClient({ shop, locale });
        const locales = await LocalesApi({ api });

        return {
            title: 'Account',
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/account/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/account/`
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
            notFound();
        }

        throw error;
    }
}

export default async function AccountPage({ params: { domain, locale: localeData } }: { params: AccountPageParams }) {
    try {
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);

        const session = await getAuthSession(shop);
        if (!session?.user) {
            return redirect(`/${locale.code}/account/login/`);
        }

        return (
            <>
                <PageContent>
                    <Heading title={`Hi ${session.user.name || 'there'}!`} subtitle={null} />
                </PageContent>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
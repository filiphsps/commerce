import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { Locale } from '@/utils/locale';
import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';
import LoginContent from './login-content';

// Make sure this page is always dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type LoginAccountPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: LoginAccountPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);

        const api = await ShopifyApiClient({ shop, locale });
        const locales = await LocalesApi({ api });

        return {
            title: 'Login',
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/account/login/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/account/login/`
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

export default async function LoginAccountPage({
    params: { domain, locale: localeData }
}: {
    params: LoginAccountPageParams;
}) {
    try {
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);

        return (
            <>
                <PageContent>
                    <Heading title="Login" subtitle={null} />

                    <LoginContent shop={shop} locale={locale} />
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

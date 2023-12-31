import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LoginContent from './login-content';

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

        const shop = await ShopApi(domain);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const store = await StoreApi({ api });
        const locales = store.i18n?.locales || [Locale.default];

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

        const shop = await ShopApi(domain);

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

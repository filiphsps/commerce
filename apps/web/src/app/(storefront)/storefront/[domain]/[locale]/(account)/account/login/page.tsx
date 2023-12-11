import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { Error } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../../not-found';
import LoginContent from './login-content';

export type LoginAccountPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: LoginAccountPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return notFoundMetadata;

        const shop = await ShopApi({ domain, locale });

        const api = await ShopifyApolloApiClient({ shop, locale });
        const store = await StoreApi({ api });
        const locales = store.i18n?.locales || [Locale.default];

        return {
            title: 'Login',
            alternates: {
                canonical: `https://${domain}/${locale.code}/account/login/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${domain}/${code}/account/login/`
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

export default async function LoginAccountPage({
    params: { domain, locale: localeData }
}: {
    params: LoginAccountPageParams;
}) {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const shop = await ShopApi({ domain, locale });

        return (
            <Page>
                <PageContent primary={true}>
                    <PageContent>
                        <Heading title="Login" subtitle={null} />

                        <LoginContent shop={shop} locale={locale} />
                    </PageContent>
                </PageContent>
            </Page>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}
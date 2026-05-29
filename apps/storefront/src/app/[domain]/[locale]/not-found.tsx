import { Compass as NotFoundIcon } from 'lucide-react';
import type { Metadata } from 'next';

import { Button } from '@/components/actionable/button';
import { EmptyState } from '@/components/empty-state';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { getDictionary } from '@/i18n/dictionary';
import { getTranslations, Locale } from '@/utils/locale';
import { getRequestContext } from '@/utils/request-context';

export const metadata: Metadata = {
    title: '404: Page Not Found',
    icons: {
        icon: ['/favicon.png'],
        shortcut: ['/favicon.png'],
        apple: ['/favicon.png'],
    },
    robots: {
        index: false,
        follow: false,
    },
    referrer: 'origin',
};

/**
 * Tenant-aware 404 page. Resolves the request's shop and locale from middleware
 * headers (`getRequestContext`) so the copy is localized, falling back to the
 * platform default locale when the request is untenanted (e.g. build-time or
 * tests). Renders the shared {@link EmptyState} with a continue-shopping action
 * so a missing page is a recoverable dead end instead of a terminal one.
 *
 * @returns The localized not-found surface with a link back to the storefront home.
 */
export default async function NotFound() {
    const ctx = await getRequestContext();
    const i18n = await getDictionary(ctx ? { shop: ctx.shop, locale: ctx.locale } : Locale.default);
    const { t } = getTranslations('common', i18n);

    return (
        <PageContent primary className="items-center justify-center">
            <EmptyState
                titleAs="h1"
                icon={<NotFoundIcon aria-hidden="true" />}
                title={t('not-found-title')}
                description={t('not-found-description')}
                action={
                    <Button as={Link} href="/">
                        {t('back-to-home')}
                    </Button>
                }
            />
        </PageContent>
    );
}

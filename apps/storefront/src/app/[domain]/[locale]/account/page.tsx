import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { type ReactNode, Suspense } from 'react';
import { Shop } from '@/api/_loaders';
import { getAuthSession } from '@/auth';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { getDictionary } from '@/utils/dictionary';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { AccountProfile } from './account-profile';

export type AccountDashboardParams = Promise<{ domain: string; locale: string }>;

export async function generateMetadata({ params }: { params: AccountDashboardParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain);
    const locale = Locale.from(localeData);

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    return {
        title: capitalize(t('account-dashboard')),
    };
}

export default async function AccountPage({ params }: { params: AccountDashboardParams }) {
    return (
        <AccountShell params={params}>
            <Suspense fallback={<div className="h-32 w-full" data-skeleton />}>
                <AccountSession params={params} />
            </Suspense>
        </AccountShell>
    );
}

async function AccountShell({ params, children }: { params: AccountDashboardParams; children: ReactNode }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain);
    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <Suspense key="account.dashboard.breadcrumbs" fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} title={capitalize(t('account-dashboard'))} />
                </div>
            </Suspense>
            {children}
        </>
    );
}

async function AccountSession({ params }: { params: AccountDashboardParams }) {
    // Per-user (session) — open the dynamic hole before any per-user read: the
    // sensitive-credentials shop lookup and the session cookie read below, plus
    // the `preloadQuery` in `AccountProfile`, are all uncached request-scoped
    // I/O that must never run in a prerenderable scope.
    await connection();

    const { domain } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const session = await getAuthSession(shop);

    if (!session) {
        return <div>TODO: Not logged in.</div>;
    }

    // The SFREAD-08 Lane-2 island: `preloadQuery` runs inside this dynamic
    // hole (`await connection()` above), never in the cached `AccountShell`.
    return <AccountProfile session={session} />;
}

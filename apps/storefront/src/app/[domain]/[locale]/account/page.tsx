import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Shop } from '@/api/_loaders';
import { getAuthSession } from '@/auth';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { Label } from '@/components/typography/label';
import { getDictionary } from '@/utils/dictionary';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';

export type AccountDashboardParams = Promise<{ domain: string; locale: string }>;

export async function generateMetadata({ params }: { params: AccountDashboardParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    return {
        title: capitalize(t('account-dashboard')),
    };
}

export default async function AccountPage({ params }: { params: AccountDashboardParams }) {
    // Per-user (session) — mark dynamic before Mongoose's `new Date()` runs.
    await connection();

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const [i18n, session] = await Promise.all([getDictionary({ shop, locale }), getAuthSession(shop)]);
    const { t } = getTranslations('common', i18n);
    const user = session?.user;

    return (
        <>
            <Suspense key={`account.dashboard.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} title={capitalize(t('account-dashboard'))} />
                </div>
            </Suspense>

            {!session ? <div>TODO: Not logged in.</div> : null}

            {session ? (
                <div>
                    <h1>TODO: Logged in!</h1>

                    <Label as="div">{user?.id}</Label>
                    <Label as="div">{user?.name}</Label>
                    <Label as="div">{user?.email}</Label>
                    {user?.image ? (
                        <Image
                            src={user.image}
                            alt={user.name || ''}
                            height={100}
                            width={100}
                            className="rounded-full object-cover object-center"
                        />
                    ) : null}
                </div>
            ) : null}
        </>
    );
}

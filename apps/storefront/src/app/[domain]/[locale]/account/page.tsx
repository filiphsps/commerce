import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';

import { getAuthSession } from '@/auth';
import { getDictionary } from '@/utils/dictionary';
import { capitalize, getTranslations, Locale } from '@/utils/locale';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { Label } from '@/components/typography/label';

import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type AccountDashboardParams = Promise<{ domain: string; locale: string }>;

export async function generateMetadata({ params }: { params: AccountDashboardParams }): Promise<Metadata> {
    const { domain, locale: localeData } = await params;

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    return {
        title: capitalize(t('account-dashboard'))
    };
}

export default async function AccountPage({ params }: { params: AccountDashboardParams }) {
    const { domain, locale: localeData } = await params;

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.from(localeData);

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    const session = await getAuthSession(shop);
    const user = session?.user;

    return (
        <>
            <Suspense key={`account.dashboard.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
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

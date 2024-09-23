import 'server-only';

import { Fragment, type HTMLProps } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { getAuthSession } from '@/auth';
import { enableAccountsFunctionality } from '@/utils/flags';
import { capitalize, getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import { LoginButton } from '@/components/actionable/login-button';
import { Avatar } from '@/components/informational/avatar';
import Link from '@/components/link';

export type HeaderAccountSectionProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export async function HeaderAccountSection({ shop, i18n, className, ...props }: HeaderAccountSectionProps) {
    if (!(await enableAccountsFunctionality())) {
        return null;
    }

    const session = await getAuthSession(shop);
    if (!session) {
        return <LoginButton i18n={i18n} />;
    }

    const { t } = getTranslations('common', i18n);

    return (
        <section className={cn('flex h-full items-center justify-end gap-1 empty:hidden', className)} {...props}>
            <Link href="/account/" className="hover:brightness-75 focus-visible:brightness-75" draggable={false}>
                <Avatar name={session.user?.name} src={session.user?.image} title={capitalize(t('account'))} />
            </Link>
        </section>
    );
}
HeaderAccountSection.displayName = 'Nordcom.Header.HeaderAccountSection';

function skeleton() {
    return (
        <Fragment /> // TODO: This should be a skeleton, but since it's behind a flag we can't do that yet.
    );
}
HeaderAccountSection.skeleton = skeleton as typeof skeleton & { displayName: string };
HeaderAccountSection.skeleton.displayName = 'Nordcom.Header.HeaderAccountSection.Skeleton';

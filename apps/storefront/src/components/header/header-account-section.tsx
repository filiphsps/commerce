import 'server-only';

import { Fragment, type HTMLProps } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { getAuthSession } from '@/auth';
import { enableAccountsFunctionality } from '@/utils/flags';
import { cn } from '@/utils/tailwind';

import { LoginButton } from '@/components/actionable/login-button';
import { Avatar } from '@/components/informational/avatar';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type HeaderAccountSectionProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export async function HeaderAccountSection({ shop, locale, i18n, className, ...props }: HeaderAccountSectionProps) {
    if (!(await enableAccountsFunctionality())) {
        return null;
    }

    const session = await getAuthSession(shop);
    if (!session) {
        return <LoginButton i18n={i18n} />;
    }

    return (
        <section className={cn('flex h-full items-center justify-end gap-1 empty:hidden', className)} {...props}>
            <Avatar />
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

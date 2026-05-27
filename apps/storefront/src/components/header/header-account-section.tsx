import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Fragment, type HTMLProps } from 'react';

import { getAuthSession } from '@/auth';
import { LoginButton } from '@/components/actionable/login-button';
import { Avatar } from '@/components/informational/avatar';
import Link from '@/components/link';
import { accountsEnabled } from '@/utils/flags/definitions/accounts-enabled';
import { capitalize, getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type HeaderAccountSectionProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
/**
 * Async server component rendering the account area in the header.
 *
 * @param props.shop - Shop record used to evaluate the accounts feature flag.
 * @param props.i18n - Locale dictionary for label translations.
 * @param props.className - Additional CSS class names.
 * @returns Login button when unauthenticated, avatar link when authenticated, or `null` when accounts are disabled.
 */
export async function HeaderAccountSection({ shop, i18n, className, ...props }: HeaderAccountSectionProps) {
    // Inside cached subtree → .evaluate(shop). Trade-offs in defineFlag JSDoc.
    const enabled = accountsEnabled.evaluate(shop);
    if (!enabled) {
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

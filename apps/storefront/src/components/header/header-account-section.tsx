import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { HTMLProps } from 'react';

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

/**
 * Suspense fallback for {@link HeaderAccountSection} while the auth session resolves.
 *
 * Gates on the SAME per-shop `accounts-functionality` flag as the live section: that section
 * returns `null` for accounts-disabled shops, so an unconditional placeholder would flash an
 * avatar on every storefront with accounts off. `.evaluate(shop)` is the cache-safe sync read
 * (no `headers()`), so the fallback and its resolved content always agree on visibility. When
 * enabled it reserves the avatar/login footprint (`size-8` circle) to keep the header shift-free.
 *
 * @param props.shop - Shop record used to evaluate the accounts feature flag.
 * @param props.className - Additional CSS class names forwarded to the section wrapper.
 * @returns An avatar-shaped placeholder when accounts are enabled, otherwise `null`.
 */
function skeleton({ shop, className }: { shop: OnlineShop; className?: string }) {
    if (!accountsEnabled.evaluate(shop)) {
        return null;
    }

    return (
        <section aria-hidden className={cn('flex h-full items-center justify-end gap-1', className)}>
            <div className="size-8 animate-pulse rounded-full bg-(--surface-1) shadow" />
        </section>
    );
}
HeaderAccountSection.skeleton = skeleton as typeof skeleton & { displayName: string };
HeaderAccountSection.skeleton.displayName = 'Nordcom.Header.HeaderAccountSection.Skeleton';

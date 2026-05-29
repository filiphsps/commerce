'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { Button } from '@/components/actionable/button';
import { EmptyState } from '@/components/empty-state';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import { useOptionalShop } from '@/components/shop/provider';
import { getDictionary } from '@/i18n/dictionary';
import enDictionary from '@/i18n/en.json';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

/**
 * Next.js error boundary for the tenant route segment. Stays a Client Component
 * because it consumes `reset`, `useEffect`, and `useOptionalShop`.
 *
 * `useOptionalShop` exposes only `{ shop, currency, locale }` — never a
 * dictionary — so this boundary cannot reuse the server `getDictionary` result
 * that page components thread through props. It instead loads the locale-keyed
 * client dictionary on mount: English renders immediately, then the shop's
 * resolved locale swaps in after hydration. The cleaner fix is to thread the
 * dictionary through `ShopProvider`, but that provider is owned outside this
 * change.
 *
 * @param props.error - The thrown error; surfaced to the console for debugging.
 * @param props.reset - Next.js recovery callback that re-renders the segment.
 * @returns The localized error surface with retry and continue-shopping actions.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    // Next.js error boundary: surface unhandled errors to the browser console for
    // debugging. This is the documented sink for client-visible errors and is
    // explicitly exempted from the no-console policy.
    //
    // Pull plain fields out — the `error` object can carry frames / cause
    // chains that reference tainted values (e.g. Shopify private tokens
    // surfaced via `experimental_taintUniqueValue`), which would re-trip the
    // taint guard inside `console.error`'s stringify step.
    useEffect(() => {
        console.error('[storefront/error]', {
            message: error.message,
            digest: error.digest,
        });
    }, [error]);

    const ctx = useOptionalShop();
    const shopName = ctx?.shop?.name;
    const logo = ctx?.shop?.design?.header?.logo;
    const locale = ctx?.locale;

    const [i18n, setI18n] = useState<LocaleDictionary>(enDictionary);
    useEffect(() => {
        if (!locale) {
            return;
        }

        let active = true;
        void getDictionary(locale).then((dictionary) => {
            // Guard the empty-dictionary fallback so a degenerate lookup keeps the
            // English copy already showing instead of leaking raw translation keys.
            if (active && Object.keys(dictionary).length > 0) {
                setI18n(dictionary);
            }
        });

        return () => {
            active = false;
        };
    }, [locale]);

    const { t } = getTranslations('common', i18n);

    return (
        <PageContent primary className="items-center justify-center">
            {logo?.src ? (
                <Image
                    src={logo.src}
                    alt={logo.alt ?? shopName ?? 'Shop logo'}
                    width={logo.width}
                    height={logo.height}
                    className="mx-auto mb-2 max-h-12 w-auto object-contain"
                    unoptimized
                />
            ) : null}

            <EmptyState
                titleAs="h1"
                title={t('error-title')}
                description={t('error-description', shopName ? <b key="shop">{shopName}</b> : t('this-shop'))}
                action={
                    <>
                        <Button type="button" variant="primary" onClick={() => reset()}>
                            {t('try-again')}
                        </Button>

                        {ctx ? (
                            <Button as={Link} variant="secondary" href="/">
                                {t('back-to-home')}
                            </Button>
                        ) : null}
                    </>
                }
            />
        </PageContent>
    );
}

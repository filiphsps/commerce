'use client';

import { Button, Details } from '@nordcom/nordstar';
import { Check, Loader2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { TextField } from '@/components/ui/text-field';
import type { ConnectFormProps } from '@/lib/commerce-providers/types';
import { cn } from '@/utils/tailwind';
// Relative import: the admin tsconfig has no `@/app/*` alias, and the action is co-located with this
// connector (Task 2), so it resolves as a sibling.
import { testShopifyConnection } from './actions';

/** Local outcome of the "Test connection" action. `restored` is a remount of a previously-passing test. */
type TestState =
    | { status: 'idle' }
    | { status: 'restored' }
    | { status: 'testing' }
    | { status: 'ok'; shopName: string }
    | { status: 'error'; error: string };

/**
 * Shopify connect step. Renders a method toggle whose OAuth option is present but disabled (the
 * "coming soon" / OAuth-ready seam) and an active manual-credentials form. The "Test connection" button
 * fires the live Storefront-API ping; a successful test calls `onTestResult(true)` so the wizard can
 * advance. Any field edit invalidates the prior test (`onTestResult(false)`), forcing a re-test before
 * the operator can continue — connection validity always reflects the current credentials. When the
 * wizard already holds a passing verdict (`verified`), the form mounts showing that confirmation rather
 * than reverting to an untested state on back-navigation.
 *
 * @param props - {@link ConnectFormProps}: current values, change lifter, the test-result callback, and
 *   the wizard's persisted `verified` verdict.
 * @returns The Shopify connect form.
 */
export function ShopifyConnectForm({ value, onChange, onTestResult, verified }: ConnectFormProps): React.JSX.Element {
    const [test, setTest] = useState<TestState>(() => (verified ? { status: 'restored' } : { status: 'idle' }));

    /**
     * Lifts a single field edit into wizard state and invalidates any prior passing test, so the
     * connection verdict always reflects the current credentials.
     *
     * @param key - The connect-value key being edited.
     * @param next - The new field value.
     */
    const update = useCallback(
        (key: string, next: string): void => {
            onChange({ ...value, [key]: next });
            setTest({ status: 'idle' });
            onTestResult(false);
        },
        [onChange, onTestResult, value],
    );

    /**
     * Fires the live Storefront-API ping for the entered store domain + public token and reports the
     * verdict via `onTestResult`. Only reachable once all three credential fields are non-empty (the
     * Test button's disabled gate), so a pass implies the private token is present too.
     *
     * @returns Resolves once the verdict is recorded.
     */
    const runTest = useCallback(async (): Promise<void> => {
        setTest({ status: 'testing' });
        const result = await testShopifyConnection({
            storeDomain: value.storeDomain ?? '',
            publicToken: value.publicToken ?? '',
        });
        if (result.ok) {
            setTest({ status: 'ok', shopName: result.shopName });
            onTestResult(true);
        } else {
            setTest({ status: 'error', error: result.error });
            onTestResult(false);
        }
    }, [onTestResult, value.publicToken, value.storeDomain]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2" role="group" aria-label="Connection method">
                <Button
                    variant="outline"
                    color="foreground"
                    disabled
                    title="OAuth install — coming soon"
                    className="flex-1"
                >
                    Install via OAuth (soon)
                </Button>
                <Button variant="solid" color="primary" disabled className="flex-1">
                    Paste credentials
                </Button>
            </div>

            <TextField
                label="Store domain"
                placeholder="acme.myshopify.com"
                value={value.storeDomain ?? ''}
                onChange={(next) => update('storeDomain', next)}
            />
            <TextField
                label="Public access token"
                placeholder="Storefront API public token"
                value={value.publicToken ?? ''}
                onChange={(next) => update('publicToken', next)}
            />
            <TextField
                label="Private access token"
                type="password"
                placeholder="Storefront API private token"
                value={value.privateToken ?? ''}
                onChange={(next) => update('privateToken', next)}
            />

            <Details label="Advanced">
                <TextField
                    label="Storefront ID (optional)"
                    placeholder="gid://shopify/Shop/…"
                    value={value.storefrontId ?? ''}
                    onChange={(next) => update('storefrontId', next)}
                />
            </Details>

            <div className="flex flex-col gap-2">
                <Button
                    variant="solid"
                    color="primary"
                    onClick={runTest}
                    className="w-full"
                    disabled={
                        test.status === 'testing' || !value.storeDomain || !value.publicToken || !value.privateToken
                    }
                >
                    {test.status === 'testing' ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Testing…
                        </span>
                    ) : (
                        'Test connection'
                    )}
                </Button>
                <div
                    aria-live="polite"
                    className={cn(
                        'flex items-center gap-2 font-medium text-sm',
                        (test.status === 'ok' || test.status === 'restored') && 'text-primary',
                        test.status === 'error' && 'text-destructive-foreground',
                    )}
                >
                    {test.status === 'restored' ? (
                        <>
                            <Check className="size-4" aria-hidden="true" /> Connection verified
                        </>
                    ) : null}
                    {test.status === 'ok' ? (
                        <>
                            <Check className="size-4" aria-hidden="true" /> Connected to {test.shopName}
                        </>
                    ) : null}
                    {test.status === 'error' ? (
                        <>
                            <X className="size-4" aria-hidden="true" /> {test.error}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

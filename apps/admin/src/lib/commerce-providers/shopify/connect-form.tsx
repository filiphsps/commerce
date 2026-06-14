'use client';

import { Button, Details, Input, Label } from '@nordcom/nordstar';
import { useCallback, useState } from 'react';
import type { ConnectFormProps } from '@/lib/commerce-providers/types';
// Relative import: the admin tsconfig has no `@/app/*` alias, and the action is co-located with this
// connector (Task 2), so it resolves as a sibling.
import { testShopifyConnection } from './actions';

/** Local outcome of the "Test connection" action. */
type TestState =
    | { status: 'idle' }
    | { status: 'testing' }
    | { status: 'ok'; shopName: string }
    | { status: 'error'; error: string };

/**
 * Shopify connect step. Renders a method toggle whose OAuth option is present but disabled (the
 * "coming soon" / OAuth-ready seam) and an active manual-credentials form. The "Test connection" button
 * fires the live Storefront-API ping; a successful test calls `onTestResult(true)` so the wizard can
 * advance. Any field edit invalidates the prior test (`onTestResult(false)`), forcing a re-test before
 * the operator can continue — connection validity always reflects the current credentials.
 *
 * @param props - {@link ConnectFormProps}: current values, change lifter, and the test-result callback.
 * @returns The Shopify connect form.
 */
export function ShopifyConnectForm({ value, onChange, onTestResult }: ConnectFormProps): React.JSX.Element {
    const [test, setTest] = useState<TestState>({ status: 'idle' });

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
                <Button variant="outline" color="foreground" disabled title="OAuth install — coming soon">
                    Install via OAuth (soon)
                </Button>
                <Button variant="solid" color="primary" disabled>
                    Paste credentials
                </Button>
            </div>

            <Input
                label="Store domain"
                placeholder="acme.myshopify.com"
                value={value.storeDomain ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => update('storeDomain', event.target.value)}
            />
            <Input
                label="Public access token"
                placeholder="Storefront API public token"
                value={value.publicToken ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => update('publicToken', event.target.value)}
            />
            <Input
                label="Private access token"
                type="password"
                placeholder="Storefront API private token"
                value={value.privateToken ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => update('privateToken', event.target.value)}
            />

            <Details>
                <summary>Advanced</summary>
                <Input
                    label="Storefront ID (optional)"
                    placeholder="gid://shopify/Shop/…"
                    value={value.storefrontId ?? ''}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        update('storefrontId', event.target.value)
                    }
                />
            </Details>

            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    color="foreground"
                    onClick={runTest}
                    disabled={
                        test.status === 'testing' || !value.storeDomain || !value.publicToken || !value.privateToken
                    }
                >
                    {test.status === 'testing' ? 'Testing…' : 'Test connection'}
                </Button>
                {test.status === 'ok' ? <Label as="span">Connected to {test.shopName} ✓</Label> : null}
                {test.status === 'error' ? <Label as="span">{test.error}</Label> : null}
            </div>
        </div>
    );
}

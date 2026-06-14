'use client';

import { Button, Card, Heading, Input, Label } from '@nordcom/nordstar';
import { useCallback, useState } from 'react';

import { COMMERCE_PROVIDERS, PROVIDER_ORDER } from '@/lib/commerce-providers/registry';
import { DEFAULT_SHOP_LOCALE } from '@/lib/new-shop/defaults';
import type { CreateShopInput } from '@/lib/new-shop/types';
import { isValidHostname, isValidLocale } from '@/lib/new-shop/validation';
import { checkDomainAvailability, createShop } from './actions';

/** Availability state for the typed customer-facing domain. */
type DomainStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/** The four ordered wizard steps. */
const STEPS = ['Basics', 'Connect', 'Branding', 'Review'] as const;

/** Props for {@link NewShopWizard}. */
export type NewShopWizardProps = {
    /**
     * The platform service domain operators point their DNS at, passed from the server page (which reads
     * `process.env.SERVICE_DOMAIN` — a server-only var with no `NEXT_PUBLIC_` mirror, so it cannot be read
     * in this client component). Shown in the review-step DNS hint; falls back to generic copy when unset.
     */
    serviceDomain?: string;
};

/**
 * The "Connect a new Shop" wizard: a four-step client flow (Basics → Connect → Branding → Review) that
 * collects shop identity, a validated commerce-provider connection, and optional branding, then submits
 * one `createShop` server action. Each step gates the Next button on its own validity (available domain;
 * tested connection). The Connect step renders entirely from the commerce-provider registry, so it is
 * provider-agnostic.
 *
 * @param props - {@link NewShopWizardProps}.
 * @returns The wizard UI.
 */
export function NewShopWizard({ serviceDomain }: NewShopWizardProps): React.JSX.Element {
    const [step, setStep] = useState(0);

    // Basics
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');
    const [locale, setLocale] = useState(DEFAULT_SHOP_LOCALE);
    const [domainStatus, setDomainStatus] = useState<DomainStatus>('idle');

    // Connect
    const [providerType] = useState<(typeof PROVIDER_ORDER)[number]>(PROVIDER_ORDER[0] ?? 'shopify');
    const [connectValues, setConnectValues] = useState<Record<string, string>>({});
    const [connectionOk, setConnectionOk] = useState(false);

    // Branding (null until the operator chooses colors; skipping keeps it null)
    const [primaryColor, setPrimaryColor] = useState('#1a1a1a');
    const [secondaryColor, setSecondaryColor] = useState('#f5f5f5');
    const [branding, setBranding] = useState<CreateShopInput['branding']>(null);

    // Review
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    /**
     * Validates the typed domain's format and, when valid, live-checks its availability via the seam,
     * driving the Basics-step status indicator and Next gate.
     *
     * @returns Resolves once `domainStatus` reflects the outcome.
     */
    const onDomainBlur = useCallback(async (): Promise<void> => {
        if (!isValidHostname(domain)) {
            setDomainStatus('invalid');
            return;
        }
        setDomainStatus('checking');
        const { available } = await checkDomainAvailability(domain);
        setDomainStatus(available ? 'available' : 'taken');
    }, [domain]);

    const basicsValid = name.trim().length > 0 && domainStatus === 'available' && isValidLocale(locale);
    const provider = COMMERCE_PROVIDERS[providerType];

    /**
     * Submits the collected wizard state to `createShop`. On success the action redirects (the promise
     * never resolves normally); a resolved value is always a failure, surfaced on the review step.
     *
     * @returns Resolves once a failure is shown, or never (server redirect) on success.
     */
    const submit = useCallback(async (): Promise<void> => {
        setSubmitting(true);
        setSubmitError(null);
        const result = await createShop({
            name,
            domain,
            locale,
            provider: { type: providerType, values: connectValues },
            branding,
        });
        // A resolved value only happens on failure — success redirects.
        if (result && result.ok === false) {
            setSubmitError(result.error);
            setSubmitting(false);
        }
    }, [branding, connectValues, domain, locale, name, providerType]);

    return (
        <Card>
            <Heading level="h1">Connect a new Shop</Heading>
            <Label as="div">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </Label>

            {step === 0 ? (
                <div className="flex flex-col gap-4">
                    <Input
                        label="Shop name"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    />
                    <Input
                        label="Customer-facing domain"
                        placeholder="shop.acme.com"
                        value={domain}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setDomain(e.target.value);
                            setDomainStatus('idle');
                        }}
                        onBlur={onDomainBlur}
                    />
                    {domainStatus === 'checking' ? <Label as="span">Checking…</Label> : null}
                    {domainStatus === 'available' ? <Label as="span">Domain is available ✓</Label> : null}
                    {domainStatus === 'taken' ? <Label as="span">That domain is already in use.</Label> : null}
                    {domainStatus === 'invalid' ? (
                        <Label as="span">Enter a full hostname, e.g. shop.acme.com.</Label>
                    ) : null}
                    <label className="flex flex-col gap-1">
                        <span>Default locale</span>
                        <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                            <option value="en-US">en-US</option>
                            <option value="en-GB">en-GB</option>
                            <option value="sv-SE">sv-SE</option>
                            <option value="de-DE">de-DE</option>
                            <option value="fr-FR">fr-FR</option>
                        </select>
                    </label>
                </div>
            ) : null}

            {step === 1 ? (
                <div className="flex flex-col gap-4">
                    <Label as="div">Connect {provider?.label ?? providerType}</Label>
                    {provider ? (
                        <provider.ConnectForm
                            value={connectValues}
                            onChange={setConnectValues}
                            onTestResult={setConnectionOk}
                        />
                    ) : null}
                </div>
            ) : null}

            {step === 2 ? (
                <div className="flex flex-col gap-4">
                    <Label as="div">Branding is optional — you can set it later in settings.</Label>
                    <label className="flex items-center gap-2">
                        <span>Primary</span>
                        <input
                            type="color"
                            aria-label="Primary accent"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                        />
                    </label>
                    <label className="flex items-center gap-2">
                        <span>Secondary</span>
                        <input
                            type="color"
                            aria-label="Secondary accent"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                        />
                    </label>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            color="foreground"
                            onClick={() => {
                                setBranding(null);
                                setStep(3);
                            }}
                        >
                            Skip
                        </Button>
                        <Button
                            variant="solid"
                            color="primary"
                            onClick={() => {
                                setBranding({ primaryColor, secondaryColor });
                                setStep(3);
                            }}
                        >
                            Use these colors
                        </Button>
                    </div>
                </div>
            ) : null}

            {step === 3 ? (
                <div className="flex flex-col gap-3">
                    <Label as="div">Review</Label>
                    <Label as="span">Name: {name}</Label>
                    <Label as="span">Domain: {domain}</Label>
                    <Label as="span">Locale: {locale}</Label>
                    <Label as="span">Provider: {provider?.label ?? providerType}</Label>
                    <Label as="span">Branding: {branding ? 'custom colors' : 'platform defaults'}</Label>
                    <Label as="span">
                        After creating, point your domain&apos;s DNS at {serviceDomain ?? 'our service domain'}.
                    </Label>
                    {submitError ? <Label as="span">Error: {submitError}</Label> : null}
                    <Button variant="solid" color="primary" onClick={submit} disabled={submitting}>
                        {submitting ? 'Creating…' : 'Create shop'}
                    </Button>
                </div>
            ) : null}

            <footer className="flex justify-between pt-4">
                <Button
                    variant="outline"
                    color="foreground"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                >
                    Back
                </Button>
                {step < 2 ? (
                    <Button
                        variant="solid"
                        color="primary"
                        onClick={() => setStep((s) => s + 1)}
                        disabled={(step === 0 && !basicsValid) || (step === 1 && !connectionOk)}
                    >
                        Next
                    </Button>
                ) : null}
            </footer>
        </Card>
    );
}

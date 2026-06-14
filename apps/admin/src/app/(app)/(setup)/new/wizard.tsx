'use client';

import { Accented, Button, Heading, Input, Label } from '@nordcom/nordstar';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Globe,
    Loader2,
    Palette,
    Plug,
    Store,
    X,
} from 'lucide-react';
import { type ComponentType, useCallback, useRef, useState } from 'react';

import { COMMERCE_PROVIDERS, PROVIDER_ORDER } from '@/lib/commerce-providers/registry';
import { DEFAULT_SHOP_LOCALE } from '@/lib/new-shop/defaults';
import type { CreateShopInput } from '@/lib/new-shop/types';
import { isValidHostname, isValidLocale, readableForeground } from '@/lib/new-shop/validation';
import { cn } from '@/utils/tailwind';
import { checkDomainAvailability, createShop } from './actions';

/** Availability state for the typed customer-facing domain. */
type DomainStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/** Static metadata for each ordered wizard step — its short stepper label and a lucide glyph. */
const STEPS: ReadonlyArray<{ key: string; label: string; Icon: ComponentType<{ className?: string }> }> = [
    { key: 'basics', label: 'Basics', Icon: Store },
    { key: 'connect', label: 'Connect', Icon: Plug },
    { key: 'branding', label: 'Branding', Icon: Palette },
    { key: 'review', label: 'Review', Icon: ClipboardCheck },
];

/** Locales offered in the Basics step. Curated tags that all satisfy {@link isValidLocale}. */
const LOCALE_OPTIONS = ['en-US', 'en-GB', 'sv-SE', 'de-DE', 'fr-FR'] as const;

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
    /**
     * Monotonic id for the in-flight domain availability check. Bumped when a check starts and on every
     * domain edit, so a slow response for a since-changed domain is discarded instead of marking the
     * current (unchecked) value available — the only client guard against submitting a taken domain.
     */
    const domainCheckSeq = useRef(0);

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
     * Navigates to a step, clearing any stale submit error so a prior failure never lingers on a screen
     * the operator has since left and returned to.
     *
     * @param next - The target step index.
     */
    const goTo = useCallback((next: number): void => {
        setSubmitError(null);
        setStep(next);
    }, []);

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
        const seq = ++domainCheckSeq.current;
        setDomainStatus('checking');
        const { available } = await checkDomainAvailability(domain);
        // Discard a result the user has already superseded by editing the domain (or re-blurring).
        if (seq !== domainCheckSeq.current) {
            return;
        }
        setDomainStatus(available ? 'available' : 'taken');
    }, [domain]);

    const basicsValid = name.trim().length > 0 && domainStatus === 'available' && isValidLocale(locale);
    const provider = COMMERCE_PROVIDERS[providerType];
    const heading = step === 1 ? `Connect ${provider?.label ?? providerType}` : (STEPS[step]?.label ?? '');

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
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8">
            <div className="relative w-full max-w-xl">
                {/* Subtle pink halo for atmosphere — echoes the primary accent without breaking the flat-dark canvas. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-1/2 -z-10 h-48 w-3/4 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
                />

                <article className="flex flex-col gap-6 rounded-2xl border-3 border-border border-solid bg-card/40 p-5 backdrop-blur-sm sm:p-6">
                    <header className="flex flex-col gap-1">
                        <Label as="div" className="text-muted-foreground">
                            Connect a <Accented>new</Accented> Shop
                        </Label>
                        <Heading level="h1">{heading}</Heading>
                    </header>

                    <WizardStepper current={step} onStepClick={goTo} />

                    <div
                        key={step}
                        className="fade-in slide-in-from-right-4 flex animate-in flex-col gap-4 duration-300"
                    >
                        {step === 0 ? (
                            <>
                                <Input
                                    label="Shop name"
                                    value={name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                />
                                <div className="flex flex-col gap-2">
                                    <Input
                                        label="Customer-facing domain"
                                        placeholder="shop.acme.com"
                                        value={domain}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setDomain(e.target.value);
                                            setDomainStatus('idle');
                                            // Invalidate any in-flight check so its late result can't mark this edit available.
                                            domainCheckSeq.current++;
                                        }}
                                        onBlur={onDomainBlur}
                                    />
                                    <DomainStatusBadge status={domainStatus} />
                                </div>
                                <label className="flex flex-col gap-2">
                                    <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                                        Default locale
                                    </span>
                                    <select
                                        value={locale}
                                        onChange={(e) => setLocale(e.target.value)}
                                        className="rounded-lg border-3 border-border bg-transparent px-3 py-2 font-medium transition-colors focus:border-primary"
                                    >
                                        {LOCALE_OPTIONS.map((tag) => (
                                            <option key={tag} value={tag} className="bg-background">
                                                {tag}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </>
                        ) : null}

                        {step === 1 ? (
                            provider ? (
                                <provider.ConnectForm
                                    value={connectValues}
                                    onChange={setConnectValues}
                                    onTestResult={setConnectionOk}
                                    verified={connectionOk}
                                />
                            ) : (
                                <Label as="span" className="text-muted-foreground">
                                    No commerce provider is available to connect.
                                </Label>
                            )
                        ) : null}

                        {step === 2 ? (
                            <>
                                <Label as="div" className="text-muted-foreground">
                                    Branding is optional — you can set it later in settings.
                                </Label>
                                <div className="flex gap-3">
                                    <ColorSwatch
                                        label="Primary"
                                        ariaLabel="Primary accent"
                                        color={primaryColor}
                                        onChange={setPrimaryColor}
                                    />
                                    <ColorSwatch
                                        label="Secondary"
                                        ariaLabel="Secondary accent"
                                        color={secondaryColor}
                                        onChange={setSecondaryColor}
                                    />
                                </div>
                                <div className="flex gap-2 border-0 border-border border-t-3 border-solid pt-4">
                                    <Button
                                        variant="outline"
                                        color="foreground"
                                        className="flex-1"
                                        onClick={() => {
                                            setBranding(null);
                                            goTo(3);
                                        }}
                                    >
                                        Skip
                                    </Button>
                                    <Button
                                        variant="solid"
                                        color="primary"
                                        className="flex-1"
                                        onClick={() => {
                                            setBranding({ primaryColor, secondaryColor });
                                            goTo(3);
                                        }}
                                    >
                                        Use these colors
                                    </Button>
                                </div>
                            </>
                        ) : null}

                        {step === 3 ? (
                            <>
                                <dl className="flex flex-col gap-0 overflow-hidden rounded-xl border-3 border-border border-solid">
                                    <ReviewRow label="Name" value={name} />
                                    <ReviewRow label="Domain" value={domain} />
                                    <ReviewRow label="Locale" value={locale} />
                                    <ReviewRow label="Provider" value={provider?.label ?? providerType} />
                                    <ReviewRow
                                        label="Branding"
                                        value={branding ? 'Custom colors' : 'Platform defaults'}
                                    />
                                </dl>
                                <div className="flex items-start gap-3 rounded-xl border-3 border-primary/40 border-solid bg-primary/5 p-4">
                                    <Globe className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                                    <Label as="span" className="text-muted-foreground">
                                        After creating, point your domain&apos;s DNS at{' '}
                                        <span className="font-semibold text-foreground">
                                            {serviceDomain ?? 'our service domain'}
                                        </span>
                                        .
                                    </Label>
                                </div>
                                {submitError ? (
                                    <div className="flex items-start gap-3 rounded-xl border-3 border-destructive/50 border-solid bg-destructive/10 p-4">
                                        <X
                                            className="mt-0.5 size-5 shrink-0 text-destructive-foreground"
                                            aria-hidden="true"
                                        />
                                        <Label as="span">{submitError}</Label>
                                    </div>
                                ) : null}
                                <Button
                                    variant="solid"
                                    color="primary"
                                    className="h-12 w-full"
                                    onClick={submit}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Creating…
                                        </span>
                                    ) : (
                                        'Create shop'
                                    )}
                                </Button>
                            </>
                        ) : null}
                    </div>

                    <footer className="flex justify-between gap-2 border-0 border-border border-t-3 border-solid pt-4">
                        <Button
                            variant="outline"
                            color="foreground"
                            onClick={() => goTo(Math.max(0, step - 1))}
                            disabled={step === 0}
                        >
                            <span className="flex items-center gap-1">
                                <ChevronLeft className="size-4" aria-hidden="true" /> Back
                            </span>
                        </Button>
                        {step < 2 ? (
                            <Button
                                variant="solid"
                                color="primary"
                                onClick={() => goTo(step + 1)}
                                disabled={(step === 0 && !basicsValid) || (step === 1 && !connectionOk)}
                            >
                                <span className="flex items-center gap-1">
                                    Next <ChevronRight className="size-4" aria-hidden="true" />
                                </span>
                            </Button>
                        ) : null}
                    </footer>
                </article>
            </div>
        </main>
    );
}

/** Props for {@link WizardStepper}. */
type WizardStepperProps = {
    /** Index of the active step. */
    current: number;
    /** Navigates to a completed (earlier) step; upcoming steps are never clickable. */
    onStepClick: (index: number) => void;
};

/**
 * Bold four-segment progress indicator: numbered badges joined by connector bars. Completed steps show a
 * check and are clickable to jump back; the active step is filled in the primary accent; upcoming steps
 * are muted and inert. Backward-only navigation never bypasses a forward gate.
 *
 * @param props - {@link WizardStepperProps}.
 * @returns The stepper nav.
 */
function WizardStepper({ current, onStepClick }: WizardStepperProps): React.JSX.Element {
    return (
        <nav aria-label="Progress">
            <ol className="flex items-center">
                {STEPS.map((s, i) => {
                    const state = i < current ? 'done' : i === current ? 'active' : 'upcoming';
                    const badge = (
                        <span
                            className={cn(
                                'flex size-10 items-center justify-center rounded-full border-3 border-solid font-bold transition-colors',
                                state === 'active' && 'border-primary bg-primary text-primary-foreground',
                                state === 'done' && 'border-primary text-primary hover:bg-primary/10',
                                state === 'upcoming' && 'border-border text-muted-foreground',
                            )}
                        >
                            {state === 'done' ? (
                                <Check className="size-5" aria-hidden="true" />
                            ) : (
                                <s.Icon className="size-5" />
                            )}
                        </span>
                    );
                    return (
                        <li key={s.key} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                            {state === 'done' ? (
                                <button
                                    type="button"
                                    onClick={() => onStepClick(i)}
                                    aria-label={`Go back to ${s.label}`}
                                >
                                    {badge}
                                </button>
                            ) : (
                                <span aria-label={s.label} aria-current={state === 'active' ? 'step' : undefined}>
                                    {badge}
                                </span>
                            )}
                            {i < STEPS.length - 1 ? (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'mx-2 h-[3px] flex-1 rounded-full transition-colors',
                                        i < current ? 'bg-primary' : 'bg-border',
                                    )}
                                />
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/** Props for {@link DomainStatusBadge}. */
type DomainStatusBadgeProps = {
    /** Current availability state of the typed domain. */
    status: DomainStatus;
};

/**
 * Inline availability indicator for the Basics-step domain field: a spinner while checking, a pink check
 * when free, and a destructive marker when taken or malformed. Renders nothing when idle. Announced via
 * an `aria-live` region so the verdict reaches assistive tech without a focus change.
 *
 * @param props - {@link DomainStatusBadgeProps}.
 * @returns The status badge, or `null` when idle.
 */
function DomainStatusBadge({ status }: DomainStatusBadgeProps): React.JSX.Element | null {
    if (status === 'idle') {
        return null;
    }
    const tone =
        status === 'available'
            ? 'text-primary'
            : status === 'checking'
              ? 'text-muted-foreground'
              : 'text-destructive-foreground';
    return (
        <div aria-live="polite" className={cn('flex items-center gap-2 font-medium text-sm', tone)}>
            {status === 'checking' ? (
                <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking availability…
                </>
            ) : null}
            {status === 'available' ? (
                <>
                    <Check className="size-4" aria-hidden="true" /> Domain is available
                </>
            ) : null}
            {status === 'taken' ? (
                <>
                    <X className="size-4" aria-hidden="true" /> That domain is already in use.
                </>
            ) : null}
            {status === 'invalid' ? (
                <>
                    <X className="size-4" aria-hidden="true" /> Enter a full hostname, e.g. shop.acme.com.
                </>
            ) : null}
        </div>
    );
}

/** Props for {@link ColorSwatch}. */
type ColorSwatchProps = {
    /** Short field label shown above the swatch. */
    label: string;
    /** Accessible label for the underlying color input. */
    ariaLabel: string;
    /** Current `#rrggbb` color. */
    color: string;
    /** Reports a newly picked color. */
    onChange: (color: string) => void;
};

/**
 * Live branding swatch: a large color tile previewing the chosen accent with `Aa` text in the
 * luminance-derived readable foreground — the same pairing `createShop` persists — so the operator sees
 * the real contrast before committing. The native color input overlays the tile invisibly.
 *
 * @param props - {@link ColorSwatchProps}.
 * @returns The color swatch control.
 */
function ColorSwatch({ label, ariaLabel, color, onChange }: ColorSwatchProps): React.JSX.Element {
    return (
        <label className="flex flex-1 flex-col gap-2">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
            <div
                className="relative flex h-20 items-center justify-center rounded-xl border-3 border-border border-solid"
                style={{ backgroundColor: color, color: readableForeground(color) }}
            >
                <span className="font-bold text-lg">Aa</span>
                <input
                    type="color"
                    aria-label={ariaLabel}
                    value={color}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
            </div>
            <span className="font-mono text-muted-foreground text-xs">{color}</span>
        </label>
    );
}

/** Props for {@link ReviewRow}. */
type ReviewRowProps = {
    /** Field name shown on the left. */
    label: string;
    /** Field value shown on the right. */
    value: string;
};

/**
 * One label/value row in the review summary, separated from its neighbors by a hairline border.
 *
 * @param props - {@link ReviewRowProps}.
 * @returns The summary row.
 */
function ReviewRow({ label, value }: ReviewRowProps): React.JSX.Element {
    return (
        <div className="flex items-center justify-between gap-4 border-0 border-border border-b border-solid px-4 py-3 last:border-b-0">
            <dt className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
            <dd className="truncate text-right font-medium">{value}</dd>
        </div>
    );
}

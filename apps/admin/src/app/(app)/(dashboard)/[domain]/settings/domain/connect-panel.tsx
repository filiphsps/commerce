'use client';

import { Button } from '@nordcom/nordstar';
import { Check, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RecordInstruction } from '@/lib/domains/targets';

/** A status the panel can render. */
type Status = 'pending' | 'verified' | 'failed';

/** Props for {@link ConnectPanel}. */
export type ConnectPanelProps = {
    /** The shop's customer-facing domain. */
    domain: string;
    /** Server-read starting status. */
    initialStatus: Status;
    /** DNS records to display. */
    records: RecordInstruction[];
    /** Bound `verifyDomain` server action. */
    verifyAction: (domain: string) => Promise<{ status: Status; via?: string; error?: string }>;
};

/** Max auto-poll ticks (× {@link POLL_MS}) before the panel stops polling on its own. */
const POLL_CAP = 12;
/** Auto-poll interval in ms. */
const POLL_MS = 10_000;

/**
 * Domain connect/verify panel: renders the DNS records to add, a live status badge, and a Verify
 * button. While `pending`, it auto-polls the bound verify action (capped) so the badge flips to
 * verified as DNS propagates without the operator re-clicking. Routing is never gated on this — the
 * panel is purely operator feedback.
 *
 * @param props - {@link ConnectPanelProps}.
 * @returns The connect panel UI.
 */
export function ConnectPanel({ domain, initialStatus, records, verifyAction }: ConnectPanelProps): React.JSX.Element {
    const [status, setStatus] = useState<Status>(initialStatus);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ticks = useRef(0);

    const runVerify = useCallback(async (): Promise<Status> => {
        setChecking(true);
        setError(null);
        try {
            const result = await verifyAction(domain);
            setStatus(result.status);
            if (result.error) {
                setError(result.error);
            }
            return result.status;
        } finally {
            setChecking(false);
        }
    }, [domain, verifyAction]);

    useEffect(() => {
        if (status !== 'pending') {
            return;
        }
        ticks.current = 0;
        const id = setInterval(async () => {
            ticks.current += 1;
            if (ticks.current > POLL_CAP) {
                clearInterval(id);
                return;
            }
            const next = await runVerify();
            if (next !== 'pending') {
                clearInterval(id);
            }
        }, POLL_MS);
        return () => clearInterval(id);
    }, [status, runVerify]);

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
                <h2 className="font-bold text-sm uppercase tracking-wide">DNS records</h2>
                <p className="text-muted-foreground text-sm">
                    Add one of these at your DNS provider for <span className="font-semibold">{domain}</span>.
                </p>
                <ul className="flex flex-col gap-2">
                    {records.map((record) => (
                        <li
                            key={`${record.kind}-${record.host}`}
                            className="flex items-center justify-between gap-4 rounded-lg border-3 border-border border-solid px-4 py-3"
                        >
                            <span className="font-mono text-xs">
                                {record.kind} · {record.host}
                            </span>
                            <span className="font-mono text-sm">{record.value}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="flex items-center justify-between gap-4">
                <StatusBadge status={status} checking={checking} />
                <Button variant="solid" color="primary" onClick={runVerify} disabled={checking}>
                    {checking ? 'Checking…' : 'Verify now'}
                </Button>
            </section>
            {error ? <p className="text-destructive-foreground text-sm">{error}</p> : null}
        </div>
    );
}

/** Props for {@link StatusBadge}. */
type StatusBadgeProps = {
    /** The current status. */
    status: Status;
    /** Whether a check is in flight. */
    checking: boolean;
};

/**
 * Inline status badge for the connect panel: a spinner while checking, a pink check when verified, a
 * destructive marker when failed, and muted copy while pending.
 *
 * @param props - {@link StatusBadgeProps}.
 * @returns The badge.
 */
function StatusBadge({ status, checking }: StatusBadgeProps): React.JSX.Element {
    if (checking) {
        return (
            <span className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking…
            </span>
        );
    }
    if (status === 'verified') {
        return (
            <span className="flex items-center gap-2 text-primary text-sm">
                <Check className="size-4" aria-hidden="true" /> Verified
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className="flex items-center gap-2 text-destructive-foreground text-sm">
                <X className="size-4" aria-hidden="true" /> Verification failed
            </span>
        );
    }
    return <span className="text-muted-foreground text-sm">Pending — not yet connected</span>;
}

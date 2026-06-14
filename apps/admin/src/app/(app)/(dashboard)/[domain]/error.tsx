'use client';

import { Accented, Button, Heading, Label } from '@nordcom/nordstar';
import { useEffect } from 'react';

/** Props Next.js passes to a route-segment error boundary. */
export type DashboardErrorProps = {
    /** The error thrown while rendering this dashboard segment. `message` is the real cause in dev and a redacted notice in production (correlate via `digest`). */
    error: Error & { digest?: string };
    /** Re-attempts rendering the segment. */
    reset: () => void;
};

/**
 * On-brand recoverable error boundary for the shop dashboard. Replaces Next's bare "A server error
 * occurred" fallback with the admin's card styling, a retry, and — crucially — the actual error
 * message, which surfaces actionable server-side causes (e.g. "operator token minting is not
 * configured; set CONVEX_AUTH_PRIVATE_KEY") in development and the `digest` for log correlation in
 * production. The parent `[domain]` layout (shell, nav) stays mounted; only the page content is
 * replaced.
 *
 * @param props - {@link DashboardErrorProps}.
 * @returns The error card.
 */
export default function DashboardError({ error, reset }: DashboardErrorProps): React.JSX.Element {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
            <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border-3 border-border border-solid p-6">
                <header className="flex flex-col gap-1">
                    <Label as="div" className="text-muted-foreground">
                        Something <Accented>broke</Accented>
                    </Label>
                    <Heading level="h2">This page couldn&apos;t load</Heading>
                </header>

                <Label as="div" className="text-muted-foreground">
                    A server error occurred while rendering this section. Try again — if it persists, check the server
                    logs for the cause below.
                </Label>

                {error?.message ? (
                    <pre className="overflow-auto rounded-lg border-2 border-border border-solid bg-card/40 p-3 font-mono text-muted-foreground text-xs">
                        {error.message}
                        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
                    </pre>
                ) : null}

                <Button variant="solid" color="primary" className="h-11 w-full" onClick={() => reset()}>
                    Try again
                </Button>
            </div>
        </div>
    );
}

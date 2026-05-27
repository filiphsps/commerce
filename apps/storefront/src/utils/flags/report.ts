import 'server-only';

import { trace } from '@opentelemetry/api';

type ReportFn = (key: string, value: unknown) => void;

let cachedReport: ReportFn | undefined;

/**
 * Lazily loads and caches the `reportValue` function from the Vercel Flags SDK, falling back to a no-op when the module is unavailable.
 *
 * @returns The `reportValue` function from the Flags SDK, or a no-op function if the module cannot be imported.
 */
async function loadReportValue(): Promise<ReportFn> {
    if (cachedReport) return cachedReport;
    try {
        const mod = (await import('flags')) as { reportValue?: ReportFn };
        cachedReport = mod.reportValue ?? (() => {});
    } catch {
        cachedReport = () => {};
    }
    return cachedReport;
}

/**
 * Fires a non-blocking flag value report to the Vercel Flags toolbar; silently drops failures.
 *
 * @param key - The flag key being reported.
 * @param value - The evaluated flag value.
 */
export function reportFlagValue(key: string, value: unknown): void {
    void loadReportValue().then((fn) => {
        try {
            fn(key, value);
        } catch (error) {
            trace.getActiveSpan()?.addEvent('flags.report_value_failed', {
                'error.message': (error as Error)?.message ?? String(error),
                'flag.key': key,
            });
        }
    });
}

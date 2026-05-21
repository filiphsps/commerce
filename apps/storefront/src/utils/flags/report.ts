import 'server-only';

import { trace } from '@opentelemetry/api';

type ReportFn = (key: string, value: unknown) => void;

let cachedReport: ReportFn | undefined;

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

import 'server-only';

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
            console.warn('[flags] reportValue threw', error);
        }
    });
}

/**
 * The relative-time units the formatter steps through, largest first, each with its span in
 * milliseconds. Months are the 30-day editorial approximation — version history needs "3 months
 * ago", not calendar arithmetic.
 */
const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
];

/**
 * Formats an epoch-ms timestamp as a locale-aware relative phrase ("2 hours ago" / "vor 2
 * Stunden") for the versions page, in the editor's ACTIVE locale rather than a hardcoded UI
 * language. Sub-minute deltas collapse to the locale's "now" idiom (`numeric: 'auto'`), matching
 * how fresh an autosave row actually is.
 *
 * @param epochMs - The timestamp to describe.
 * @param uiLocale - The BCP-47 locale the phrase renders in (the editor's active locale).
 * @param nowMs - The reference instant; defaults to the current time (injectable for tests).
 * @returns The relative phrase, or the ISO-8601 timestamp when `Intl.RelativeTimeFormat` is
 *   unavailable or rejects the locale — an absolute time is still truthful, a wrong relative one
 *   is not.
 */
export function relativeTimeLabel(epochMs: number, uiLocale: string, nowMs: number = Date.now()): string {
    if (typeof Intl === 'undefined' || typeof Intl.RelativeTimeFormat !== 'function') {
        return new Date(epochMs).toISOString();
    }
    try {
        const formatter = new Intl.RelativeTimeFormat(uiLocale, { numeric: 'auto' });
        const delta = epochMs - nowMs;
        for (const [unit, span] of UNITS) {
            if (Math.abs(delta) >= span) {
                return formatter.format(Math.trunc(delta / span), unit);
            }
        }
        return formatter.format(0, 'second');
    } catch {
        return new Date(epochMs).toISOString();
    }
}

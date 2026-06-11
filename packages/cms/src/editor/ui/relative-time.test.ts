import { describe, expect, it } from 'vitest';
import { relativeTimeLabel } from './relative-time';

/** A fixed reference instant so every assertion is deterministic. */
const NOW = Date.UTC(2026, 4, 15, 12, 0, 0);

describe('relativeTimeLabel', () => {
    it('formats a past timestamp relative to now', () => {
        expect(relativeTimeLabel(NOW - 2 * 60 * 60 * 1000, 'en', NOW)).toBe('2 hours ago');
    });

    it('steps through coarser units as the delta grows', () => {
        expect(relativeTimeLabel(NOW - 3 * 24 * 60 * 60 * 1000, 'en', NOW)).toBe('3 days ago');
        expect(relativeTimeLabel(NOW - 60 * 24 * 60 * 60 * 1000, 'en', NOW)).toBe('2 months ago');
    });

    it('collapses sub-minute deltas to the locale "now" idiom', () => {
        expect(relativeTimeLabel(NOW - 10 * 1000, 'en', NOW)).toBe('now');
    });

    it('renders in the active locale, not hardcoded English', () => {
        // Locale-aware: the versions page passes the editor's resolved locale through.
        expect(relativeTimeLabel(NOW - 60 * 60 * 1000, 'de', NOW)).toBe('vor 1 Stunde');
    });

    it('falls back to the absolute ISO timestamp when the locale is rejected', () => {
        // An empty string is a syntactically invalid BCP-47 tag, so the constructor throws.
        expect(relativeTimeLabel(NOW - 1000, '', NOW)).toBe(new Date(NOW - 1000).toISOString());
    });
});

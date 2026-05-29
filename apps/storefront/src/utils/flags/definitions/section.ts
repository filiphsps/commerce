import 'server-only';

import { isSectionFlagKey, sectionFlagKey } from '@nordcom/commerce-db';
import { TypeError } from '@nordcom/commerce-errors';

import { type DefinedFlag, defineFlag } from '../define';

/**
 * Per-key memo of section flags. Each `section:<id>` flag is declared exactly once so repeated
 * `sectionEnabled('<id>')` call sites (e.g. the same section rendered on multiple routes) share one
 * declaration instead of registering the SDK flag again; the first call's `defaultValue` wins.
 */
const sectionFlags = new Map<string, DefinedFlag<boolean>>();

/**
 * Declares — or returns the memoized — boolean feature flag that gates whether a data-driven page
 * section renders for the current shop. Keyed `section:<id>` so a tenant can toggle the section via
 * a CMS feature-flag row without a deploy. A shop with no matching flag ref resolves to
 * `defaultValue` (default `true`), preserving today's render where sections are unconditionally shown.
 *
 * @param sectionId - Bare section identifier (e.g. `'hero'`); must not be empty or already namespaced.
 * @param defaultValue - Value returned when no flag ref or targeting rule matches. Defaults to `true` (visible).
 * @returns The memoized {@link DefinedFlag} for `section:<sectionId>`.
 * @throws {TypeError} When `sectionId` is empty/whitespace, or already carries the `section:` prefix.
 */
export function sectionEnabled(sectionId: string, defaultValue = true): DefinedFlag<boolean> {
    if (typeof sectionId !== 'string' || sectionId.trim() === '') {
        throw new TypeError('`sectionEnabled` requires a non-empty section id.');
    }
    if (isSectionFlagKey(sectionId)) {
        throw new TypeError(
            `\`sectionEnabled\` expects a bare section id, but received an already-namespaced "${sectionId}".`,
        );
    }

    const key = sectionFlagKey(sectionId);
    const existing = sectionFlags.get(key);
    if (existing) return existing;

    const flag = defineFlag<boolean>({
        key,
        description: `Controls whether the "${sectionId}" section renders.`,
        defaultValue,
        options: [
            { label: 'Hidden', value: false },
            { label: 'Visible', value: true },
        ],
    });
    sectionFlags.set(key, flag);
    return flag;
}

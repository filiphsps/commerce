import type { Code } from '@/utils/locale';
import { Locale } from '@/utils/locale';

/**
 * Creates a `Locale` object from a BCP 47 locale code for use in tests.
 *
 * @param code - The BCP 47 locale code; defaults to `'en-US'`.
 * @returns The parsed `Locale` instance for the given code.
 */
export function mockLocale(code: Code = 'en-US') {
    return Locale.from(code);
}

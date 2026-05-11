import type { Code } from '@/utils/locale';
import { Locale } from '@/utils/locale';

export function mockLocale(code: Code = 'en-US') {
    return Locale.from(code);
}

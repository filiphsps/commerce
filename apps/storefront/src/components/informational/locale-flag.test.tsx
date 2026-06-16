import { describe, expect, it } from 'vitest';
import { CurrentLocaleFlag } from '@/components/informational/current-locale-flag';
import { LocaleFlag } from '@/components/informational/locale-flag';
import { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';

const us = Locale.from({ language: 'EN', country: 'US' });

describe('components/informational/locale-flag', () => {
    describe('LocaleFlag', () => {
        it('names the flag with the full country name when shown alone', () => {
            const { container } = render(<LocaleFlag locale={us} />);
            const img = container.querySelector('img')!;
            expect(img.getAttribute('alt')).toBe('United States');
            expect(img.getAttribute('aria-hidden')).toBeNull();
        });

        it('hides the redundant flag from assistive tech when the name is shown as text', () => {
            const { container } = render(<LocaleFlag locale={us} withName={true} />);
            const img = container.querySelector('img')!;
            expect(img.getAttribute('alt')).toBe('');
            expect(img.getAttribute('aria-hidden')).toBe('true');
            // The country name is still present as visible text.
            expect(container.textContent).toContain('United States');
        });
    });

    describe('CurrentLocaleFlag', () => {
        it('defaults its accessible name to the full country name, not the ISO code', () => {
            const { container } = render(<CurrentLocaleFlag locale={us} />);
            expect(container.querySelector('img')?.getAttribute('alt')).toBe('United States');
        });
    });
});

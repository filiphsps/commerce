import { describe, expect, it } from 'vitest';
import { InfoBar } from '@/components/header/info-bar';
import { mockShop } from '@/utils/test/fixtures';

describe('components', () => {
    describe('header', () => {
        describe('InfoBar', () => {
            it('renders null while the CMS Header global is being wired in', async () => {
                const result = await InfoBar({
                    shop: mockShop(),
                    locale: { code: 'en-US' } as any,
                    i18n: {} as any,
                });
                expect(result).toBeNull();
            });
        });
    });
});

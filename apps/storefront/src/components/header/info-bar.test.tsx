import { describe, expect, it, vi } from 'vitest';
import { InfoBarApi } from '@/api/info-bar';
import { mockBusinessData, mockShop } from '@/utils/test/fixtures';
import { renderRSC } from '@/utils/test/rsc';
import { InfoBar } from './info-bar';

vi.mock('@/api/info-bar', () => ({ InfoBarApi: vi.fn() }));
vi.mock('@/components/informational/locale-flag', () => ({
    LocaleFlag: ({ locale }: { locale: { code: string } }) => <span data-testid="locale-flag">{locale.code}</span>,
}));

describe('<InfoBar>', () => {
    it('renders null when BusinessData is missing', async () => {
        vi.mocked(InfoBarApi).mockResolvedValue(null);
        const ui = await renderRSC(() =>
            InfoBar({ shop: mockShop(), locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        expect(ui.container.innerHTML).toBe('');
    });

    it('renders null when both supportEmail and supportPhone are empty', async () => {
        vi.mocked(InfoBarApi).mockResolvedValue(mockBusinessData({ supportEmail: null, supportPhone: null }));
        const ui = await renderRSC(() =>
            InfoBar({ shop: mockShop(), locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        expect(ui.container.innerHTML).toBe('');
    });

    it('renders a mailto link when supportEmail is set', async () => {
        vi.mocked(InfoBarApi).mockResolvedValue(mockBusinessData({ supportEmail: 'hi@x.test' }));
        const ui = await renderRSC(() =>
            InfoBar({ shop: mockShop(), locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        expect(ui.container.querySelector('a[href="mailto:hi@x.test"]')).toBeTruthy();
        expect(ui.container.querySelector('a[href^="tel:"]')).toBeNull();
    });

    it('renders a tel link when supportPhone is set', async () => {
        vi.mocked(InfoBarApi).mockResolvedValue(mockBusinessData({ supportPhone: '+46 70 123 45 67' }));
        const ui = await renderRSC(() =>
            InfoBar({ shop: mockShop(), locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        // strips spaces/dashes when building the tel URL.
        expect(ui.container.querySelector('a[href="tel:+46701234567"]')).toBeTruthy();
    });

    it('renders both with a divider when both are set', async () => {
        vi.mocked(InfoBarApi).mockResolvedValue(
            mockBusinessData({ supportEmail: 'hi@x.test', supportPhone: '0700000000' }),
        );
        const ui = await renderRSC(() =>
            InfoBar({ shop: mockShop(), locale: { code: 'en-US' } as never, i18n: {} as never }),
        );
        expect(ui.container.querySelector('a[href^="mailto:"]')).toBeTruthy();
        expect(ui.container.querySelector('a[href^="tel:"]')).toBeTruthy();
        expect(ui.getByText('|')).toBeTruthy();
    });
});

import type { Country } from '@shopify/hydrogen-react/storefront-api-types';
import { setCookie } from 'cookies-next';
import { usePathname, useSearchParams } from 'next/navigation';
import useGeoLocation from 'react-ipgeolocation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeoRedirect } from '@/components/geo-redirect';
import { isCrawler } from '@/utils/is-crawler';
import { Locale } from '@/utils/locale';
import { mockShop } from '@/utils/test/fixtures/shop';
import { fireEvent, render, waitFor } from '@/utils/test/react';

// `vitest.setup.ts` mocks `@/utils/build-config` to expose only `BuildConfig`.
// `<LocaleFlag>` (rendered via the picker trigger) also reads
// `FLAG_IMAGES_BASE_URL` from that module — extend the mock for this file so
// the country flag URL can resolve to a stable test value.
vi.mock('@/utils/build-config', () => ({
    BuildConfig: {
        i18n: { default: 'en-US', currencies: ['USD'] },
        shopify: { storefront_id: 'mock-id' },
    },
    FLAG_IMAGES_BASE_URL: 'https://flags.test',
}));

vi.mock('react-ipgeolocation', () => ({
    default: vi.fn(),
}));

vi.mock('cookies-next', () => ({
    setCookie: vi.fn(),
}));

vi.mock('@/utils/dictionary', () => ({
    getDictionary: vi.fn(async () => ({ common: {} })),
}));

vi.mock('@/utils/is-crawler', () => ({
    isCrawler: vi.fn(() => false),
}));

const countries: Country[] = [
    {
        isoCode: 'US',
        availableLanguages: [{ isoCode: 'EN' }],
    } as unknown as Country,
    {
        isoCode: 'SE',
        availableLanguages: [{ isoCode: 'SV' }],
    } as unknown as Country,
];

const usLocale = Locale.from('en-US') as Locale;
const shop = mockShop();
// `getTranslations` looks up `dictionary[scope][key]`, falling back to the key
// itself. A bare empty dictionary therefore returns the key as the translated
// string — which is what we want for assertions that don't care about the
// translated text but do care about the placeholder slot for the country name.
const i18n = { common: {}, cart: {}, product: {} } as never;

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(isCrawler).mockReturnValue(false);
    // Default geo + navigation per test; tests override before render.
    vi.mocked(useGeoLocation).mockReturnValue({
        isLoading: false,
        country: 'SE',
        error: false,
    } as never);
    vi.mocked(usePathname).mockReturnValue('/en-US/products/');
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('q=red') as never);
});

afterEach(() => {
    vi.mocked(useGeoLocation).mockReset();
});

describe('<GeoRedirect>', () => {
    it('renders nothing while geo location is loading', () => {
        vi.mocked(useGeoLocation).mockReturnValue({
            isLoading: true,
            country: undefined,
            error: false,
        } as never);

        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when geo country matches the current locale', () => {
        vi.mocked(useGeoLocation).mockReturnValue({
            isLoading: false,
            country: 'US',
            error: false,
        } as never);

        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        expect(container.firstChild).toBeNull();
    });

    it('renders nothing for crawlers even when geo would otherwise trigger', () => {
        vi.mocked(isCrawler).mockReturnValue(true);

        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        expect(container.firstChild).toBeNull();
    });

    it('renders the banner when geo country differs from the current locale', () => {
        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        // A banner with at least one button (the trigger or Continue) is mounted.
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);

        // The matching target locale's country name is rendered by
        // <LocaleCountryName>. For SE that's "Sweden".
        expect(container.textContent).toContain('Sweden');
    });

    it('"Continue" link href preserves the search params', () => {
        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        // The Continue Button is rendered `as={Link}`; the only anchor with a
        // `?q=red` query string is that one. The country-picker dropdown anchor
        // points at `/countries/` instead.
        const continueAnchor = Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
            (a.getAttribute('href') || '').includes('q=red'),
        );

        expect(continueAnchor).toBeDefined();
        // `Link` prefixes the target locale (`sv-SE`) and routes to the
        // computed pathname; the search params survive intact.
        expect(continueAnchor?.getAttribute('href')).toContain('/sv-SE/');
        expect(continueAnchor?.getAttribute('href')).toContain('products');
        expect(continueAnchor?.getAttribute('href')).toContain('q=red');
    });

    it('clicking the close button stores a dismiss timestamp and hides the banner', () => {
        const now = 1_700_000_000_000;
        const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        const closeButton = container.querySelector<HTMLButtonElement>('button[title="Close"]');
        expect(closeButton).not.toBeNull();

        fireEvent.click(closeButton!);

        expect(localStorage.getItem('geo-redirect-banner-dismissed')).toBe(String(now));
        // After dismissal the banner unmounts (component returns null).
        expect(container.firstChild).toBeNull();

        dateSpy.mockRestore();
    });

    it('restores focus to the trigger button when the dropdown is opened and then closed', async () => {
        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        const trigger = container.querySelector<HTMLButtonElement>('button[aria-expanded]');
        expect(trigger).not.toBeNull();

        trigger!.focus();
        fireEvent.click(trigger!);
        expect(trigger!.getAttribute('aria-expanded')).toBe('true');

        fireEvent.click(trigger!);
        expect(trigger!.getAttribute('aria-expanded')).toBe('false');

        // The focus restore happens in a `useEffect` triggered by the
        // `dropdownActiveState` change — wait for it to settle.
        await waitFor(() => {
            expect(document.activeElement).toBe(trigger);
        });
    });

    it('does not set cookies on render — only when the Continue button is clicked', () => {
        const { container } = render(<GeoRedirect countries={countries} locale={usLocale} shop={shop} i18n={i18n} />);

        expect(setCookie).not.toHaveBeenCalled();

        const continueAnchor = Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
            (a.getAttribute('href') || '').includes('q=red'),
        );
        expect(continueAnchor).toBeDefined();

        fireEvent.click(continueAnchor!);

        expect(setCookie).toHaveBeenCalledWith('localization', 'sv-SE');
        expect(setCookie).toHaveBeenCalledWith('NEXT_LOCALE', 'sv-SE');
    });
});

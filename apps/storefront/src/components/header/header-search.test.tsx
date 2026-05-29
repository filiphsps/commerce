import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderSearch } from '@/components/header/header-search';
import { useIsDesktop } from '@/components/product-options/use-is-desktop';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('@/components/product-options/use-is-desktop', () => ({
    useIsDesktop: vi.fn(),
}));

// The real Link wrapper reads shop context to localize hrefs; the baseline branch only needs the
// raw href to assert against, so render a passthrough anchor.
vi.mock('@/components/link', () => ({
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

const locale = { code: 'en-US' } as any;

describe('<HeaderSearch>', () => {
    beforeEach(() => {
        vi.mocked(useRouter).mockReturnValue({ push: vi.fn(), replace: vi.fn() } as any);
    });

    it('renders the icon-only /search/ link as the baseline before the viewport is known', () => {
        vi.mocked(useIsDesktop).mockReturnValue(null);
        const { container } = render(<HeaderSearch locale={locale} i18n={{} as any} />);

        const link = container.querySelector('a[href="/search/"]');
        expect(link).toBeTruthy();
        expect(screen.queryByRole('searchbox')).toBeNull();
    });

    it('keeps the icon-only link on touch (mobile) viewports', () => {
        vi.mocked(useIsDesktop).mockReturnValue(false);
        const { container } = render(<HeaderSearch locale={locale} i18n={{} as any} />);

        expect(container.querySelector('a[href="/search/"]')).toBeTruthy();
    });

    it('expands into an inline field and navigates to the localized search route on submit', () => {
        const push = vi.fn();
        vi.mocked(useIsDesktop).mockReturnValue(true);
        vi.mocked(useRouter).mockReturnValue({ push } as any);

        render(<HeaderSearch locale={locale} i18n={{} as any} />);

        // Desktop collapsed: a trigger button, no field yet.
        const trigger = screen.getByRole('button', { name: 'search' });
        expect(screen.queryByRole('searchbox')).toBeNull();

        fireEvent.click(trigger);

        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: '  shoes  ' } });
        const form = input.closest('form');
        expect(form).toBeTruthy();
        fireEvent.submit(form!);

        expect(push).toHaveBeenCalledWith('/en-US/search/?q=shoes');
    });

    it('does not navigate when the field is empty', () => {
        const push = vi.fn();
        vi.mocked(useIsDesktop).mockReturnValue(true);
        vi.mocked(useRouter).mockReturnValue({ push } as any);

        render(<HeaderSearch locale={locale} i18n={{} as any} />);
        fireEvent.click(screen.getByRole('button', { name: 'search' }));

        const input = screen.getByRole('searchbox');
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.submit(input.closest('form')!);

        expect(push).not.toHaveBeenCalled();
    });

    it('collapses back to the trigger on Escape', () => {
        vi.mocked(useIsDesktop).mockReturnValue(true);

        render(<HeaderSearch locale={locale} i18n={{} as any} />);
        fireEvent.click(screen.getByRole('button', { name: 'search' }));

        const input = screen.getByRole('searchbox');
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(screen.queryByRole('searchbox')).toBeNull();
        expect(screen.getByRole('button', { name: 'search' })).toBeTruthy();
    });
});

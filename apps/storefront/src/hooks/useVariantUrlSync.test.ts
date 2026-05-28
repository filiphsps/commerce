import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mockReplace }),
    usePathname: () => '/en-US/products/test/',
    useSearchParams: () => new URLSearchParams(),
}));

describe('useVariantUrlSync', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('does NOT call router.replace on initial mount', async () => {
        const { useVariantUrlSync } = await import('./useVariantUrlSync');
        renderHook(() => useVariantUrlSync([{ name: 'Color', value: 'Red' }]));
        await act(async () => {});
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('calls router.replace when options change after mount', async () => {
        const { useVariantUrlSync } = await import('./useVariantUrlSync');
        const { rerender } = renderHook(({ opts }) => useVariantUrlSync(opts), {
            initialProps: { opts: [{ name: 'Color', value: 'Red' }] },
        });
        await act(async () => {});
        mockReplace.mockClear();

        await act(async () => {
            rerender({ opts: [{ name: 'Color', value: 'Blue' }] });
        });

        expect(mockReplace).toHaveBeenCalledTimes(1);
        const [url, opts] = mockReplace.mock.calls[0] as [string, unknown];
        expect(url).toContain('Color=Blue');
        expect(opts).toMatchObject({ scroll: false });
    });

    it('sorts params alphabetically to prevent middleware 301 redirect', async () => {
        const { useVariantUrlSync } = await import('./useVariantUrlSync');
        const { rerender } = renderHook(({ opts }) => useVariantUrlSync(opts), {
            initialProps: { opts: [{ name: 'Size', value: 'S' }] },
        });
        await act(async () => {});
        mockReplace.mockClear();

        await act(async () => {
            rerender({
                opts: [
                    { name: 'Size', value: 'M' },
                    { name: 'Color', value: 'Red' },
                ],
            });
        });

        const [url] = mockReplace.mock.calls[0] as [string];
        const params = new URLSearchParams(url.split('?')[1] ?? '');
        const keys = [...params.keys()];
        expect(keys).toEqual([...keys].sort()); // Color before Size
    });

    it('does NOT call router.replace when options are unchanged', async () => {
        const { useVariantUrlSync } = await import('./useVariantUrlSync');
        const opts = [{ name: 'Color', value: 'Red' }];
        const { rerender } = renderHook(() => useVariantUrlSync(opts));
        await act(async () => {});
        mockReplace.mockClear();

        await act(async () => {
            rerender();
        });
        expect(mockReplace).not.toHaveBeenCalled();
    });
});

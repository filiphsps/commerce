import { describe, expect, it, vi } from 'vitest';
import { dropdownFixture } from '@/utils/test/fixtures/prismic/dropdown';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

// Mock HeaderProvider context used by DropdownMenuItem and DropdownDefaultMenu
vi.mock('@/components/header/header-provider', () => ({
    useHeaderMenu: vi.fn().mockReturnValue({
        menu: null,
        setMenu: vi.fn(),
        closeMenu: vi.fn(),
    }),
}));

// Mock react-detect-click-outside used in DropdownDefaultMenu
vi.mock('react-detect-click-outside', () => ({
    useDetectClickOutside: vi.fn().mockReturnValue({ current: null }),
}));

describe('slices/navigation/Dropdown', () => {
    it('renders null when not in header and menu does not match slice id', async () => {
        const slice = dropdownFixture();
        const result = await renderRSC(() => (
            <Slice slice={slice} context={{ isHeader: false, menu: null }} slices={[slice]} index={0} />
        ));
        expect(result.container.firstChild).toBeNull();
    });

    it('renders DropdownMenuItem when in header', async () => {
        const slice = dropdownFixture();
        const result = await renderRSC(() => (
            <Slice slice={slice} context={{ isHeader: true, menu: null }} slices={[slice]} index={0} />
        ));
        // Should render a button (DropdownMenuItem)
        expect(result.container.querySelector('button')).toBeTruthy();
    });

    it('renders DropdownDefaultMenu when menu matches slice id', async () => {
        const slice = dropdownFixture();
        const result = await renderRSC(() => (
            <Slice
                slice={slice}
                context={{ isHeader: false, menu: '__SLICE_MACHINE_TEST__' }}
                slices={[slice]}
                index={0}
            />
        ));
        // DropdownDefaultMenu renders a nav element
        expect(result.container.querySelector('nav')).toBeTruthy();
    });
});

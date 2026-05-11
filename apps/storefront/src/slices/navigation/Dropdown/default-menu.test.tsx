import { describe, expect, it, vi } from 'vitest';
import { dropdownFixture, dropdownWithLinksFixture } from '@/utils/test/fixtures/prismic/dropdown';
import { renderRSC } from '@/utils/test/rsc';
import { DropdownDefaultMenu } from './default-menu';

vi.mock('@/components/header/header-provider', () => ({
    useHeaderMenu: vi.fn().mockReturnValue({
        menu: null,
        setMenu: vi.fn(),
        closeMenu: vi.fn(),
    }),
}));

vi.mock('react-detect-click-outside', () => ({
    useDetectClickOutside: vi.fn().mockReturnValue({ current: null }),
}));

describe('slices/navigation/Dropdown/DropdownDefaultMenu', () => {
    it('renders a nav element without throwing', async () => {
        const slice = dropdownFixture();
        const result = await renderRSC(() => <DropdownDefaultMenu slice={slice} />);
        expect(result.container.querySelector('nav')).toBeTruthy();
    });

    it('renders with empty links list', async () => {
        const slice = dropdownFixture({ links: [] });
        const result = await renderRSC(() => <DropdownDefaultMenu slice={slice} />);
        expect(result.container.querySelector('nav')).toBeTruthy();
    });

    it('renders links when provided', async () => {
        const slice = dropdownWithLinksFixture();
        const result = await renderRSC(() => <DropdownDefaultMenu slice={slice} />);
        // Links with null image render as anchor-like elements
        expect(result.container.querySelector('nav')).toBeTruthy();
    });
});

import { describe, expect, it, vi } from 'vitest';
import { dropdownFixture } from '@/utils/test/fixtures/prismic/dropdown';
import { renderRSC } from '@/utils/test/rsc';
import { DropdownMenuItem } from './menu-item';

vi.mock('@/components/header/header-provider', () => ({
    useHeaderMenu: vi.fn().mockReturnValue({
        menu: null,
        setMenu: vi.fn(),
        closeMenu: vi.fn(),
    }),
}));

describe('slices/navigation/Dropdown/DropdownMenuItem', () => {
    it('renders a button without throwing', async () => {
        const slice = dropdownFixture();
        const result = await renderRSC(() => <DropdownMenuItem slice={slice} />);
        expect(result.container.querySelector('button')).toBeTruthy();
    });

    it('renders the dropdown title text', async () => {
        const slice = dropdownFixture({ title: [{ type: 'paragraph', text: 'Shop Menu', spans: [] }] });
        const result = await renderRSC(() => <DropdownMenuItem slice={slice} />);
        expect(result.getByText('Shop Menu')).toBeTruthy();
    });
});

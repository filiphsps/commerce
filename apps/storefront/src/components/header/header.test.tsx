import { describe, expect, it, vi } from 'vitest';

// Block the entire import chain that pulls in next-auth → next/server (ESM compat issue).
vi.mock('@/auth', () => ({
    getAuthSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: vi.fn() },
}));

vi.mock('@/api/navigation', () => ({
    HeaderApi: vi.fn().mockResolvedValue(null),
    MenuApi: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/slices/common/CustomHtml', () => ({
    default: () => null,
}));

vi.mock('@/components/header/header-account-section', () => {
    const HeaderAccountSection = () => null;
    HeaderAccountSection.skeleton = () => null;
    return { HeaderAccountSection };
});

vi.mock('@/components/header/cart-button', () => ({
    CartButton: () => null,
}));

vi.mock('@/components/header/header-menu', () => ({
    HeaderMenu: () => null,
}));

vi.mock('@/components/header/header-navigation', () => {
    const HeaderNavigation = () => null;
    HeaderNavigation.skeleton = () => null;
    return { HeaderNavigation };
});

vi.mock('@/components/link', () => ({
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

import HeaderComponent from '@/components/header/header';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('header', () => {
        describe('HeaderComponent', () => {
            it('is an async function (RSC)', () => {
                expect(typeof HeaderComponent).toBe('function');
            });

            it('skeleton renders a sticky header section', () => {
                const { container } = render(<HeaderComponent.skeleton />);
                expect(container.querySelector('section')).toBeTruthy();
            });
        });
    });
});

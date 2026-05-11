import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/layout/modal';
import { render } from '@/utils/test/react';

vi.mock('next/navigation', () => ({
    usePathname: () => '/en-US/test',
    useRouter: () => ({
        back: vi.fn(),
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        refresh: vi.fn(),
        forward: vi.fn(),
    }),
}));

describe('components', () => {
    describe('Modal', () => {
        it('renders without errors', () => {
            const { unmount } = render(
                <Modal title="Test" description="Test" i18n={{} as any}>
                    <div>Test</div>
                </Modal>,
            );
            expect(unmount).not.toThrow();
        });
    });
});

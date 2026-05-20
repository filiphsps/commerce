import { describe, expect, it, vi } from 'vitest';
import { Toolbars } from '@/components/toolbars';
import { render } from '@/utils/test/react';

vi.mock('@vercel/toolbar/next', async () => {
    return {
        VercelToolbar: () => <div data-testid="toolbar" />,
    };
});

describe('components', () => {
    describe('Toolbars', () => {
        it('renders without crashing', async () => {
            const { unmount } = render(<Toolbars />);
            expect(() => unmount()).not.toThrow();
        });

        it('renders the toolbar', async () => {
            const { getByTestId } = render(<Toolbars />);
            expect(getByTestId('toolbar')).toBeDefined();
        });

        it('renders children when toolbar is present', async () => {
            const { getByText, getByTestId } = render(
                <Toolbars>
                    <div>Test</div>
                </Toolbars>,
            );

            expect(getByText('Test')).toBeDefined();
            expect(getByTestId('toolbar')).toBeDefined();
        });
    });
});

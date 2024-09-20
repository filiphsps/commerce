import { describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';

import { Toolbars } from '@/components/toolbars';

describe('components', () => {
    describe('Toolbars', () => {
        vi.mock('@vercel/toolbar/next', async () => {
            return {
                VercelToolbar: () => <div data-testid="toolbar" />
            };
        });

        it('renders without crashing', async () => {
            const { unmount } = render(<Toolbars domain={'staging.example.com'} />);
            expect(() => unmount()).not.toThrow();
        });

        it('renders the toolbar', async () => {
            const { getByTestId } = render(<Toolbars domain={'staging.example.com'} />);
            expect(getByTestId('toolbar')).toBeDefined();
        });

        it('does not render the toolbar', async () => {
            const { queryByTestId } = render(<Toolbars domain={'example.com'} />);
            expect(queryByTestId('toolbar')).toBeNull();
        });

        it('renders children when toolbar is present', async () => {
            const { getByText, getByTestId } = render(
                <Toolbars domain={'staging.example.com'}>
                    <div>Test</div>
                </Toolbars>
            );

            expect(getByText('Test')).toBeDefined();
            expect(getByTestId('toolbar')).toBeDefined();
        });

        it('does not render children when toolbar is not present', async () => {
            const { queryByTestId, getByText } = render(
                <Toolbars domain={'example.com'}>
                    <div>Test</div>
                </Toolbars>
            );

            expect(getByText('Test')).toBeDefined();
            expect(queryByTestId('toolbar')).toBeNull();
        });
    });
});

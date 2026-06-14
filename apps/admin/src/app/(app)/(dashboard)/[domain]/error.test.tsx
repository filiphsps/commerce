import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('@nordcom/nordstar', () => ({
    Accented: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
        <button type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Heading: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Label: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import type React from 'react';
import DashboardError from './error';

describe('dashboard error boundary', () => {
    it('surfaces the underlying error message (the actionable cause in dev)', () => {
        const error = new Error(
            'cms/list:list — operator token minting is not configured; set CONVEX_AUTH_PRIVATE_KEY',
        );
        render(<DashboardError error={error} reset={() => {}} />);
        expect(screen.getByText(/CONVEX_AUTH_PRIVATE_KEY/)).toBeTruthy();
    });

    it('retries via reset when Try again is clicked', () => {
        const reset = vi.fn();
        render(<DashboardError error={new Error('boom')} reset={reset} />);
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(reset).toHaveBeenCalledTimes(1);
    });
});

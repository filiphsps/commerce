import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@nordcom/nordstar', () => ({
    Button: ({
        children,
        onClick,
        disabled,
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
    }) => (
        <button type="button" onClick={onClick} disabled={disabled}>
            {children}
        </button>
    ),
}));

import type { RecordInstruction } from '@/lib/domains/targets';
import { ConnectPanel } from './connect-panel';

const records: RecordInstruction[] = [{ kind: 'CNAME', host: 'subdomain', value: 'cname.vercel-dns.com' }];

describe('ConnectPanel', () => {
    it('shows the records and the initial status', () => {
        const { getByText } = render(
            <ConnectPanel
                domain="shop.acme.com"
                initialStatus="failed"
                records={records}
                verifyAction={vi.fn(async () => ({ status: 'failed' as const }))}
            />,
        );
        expect(getByText('cname.vercel-dns.com')).toBeInTheDocument();
        expect(getByText(/verification failed/i)).toBeInTheDocument();
    });

    it('flips to verified after a successful verify click', async () => {
        const verifyAction = vi.fn(async () => ({ status: 'verified' as const, via: 'vercel' }));
        const { getByRole, getByText } = render(
            <ConnectPanel
                domain="shop.acme.com"
                initialStatus="failed"
                records={records}
                verifyAction={verifyAction}
            />,
        );
        fireEvent.click(getByRole('button', { name: /verify/i }));
        await waitFor(() => expect(getByText(/verified/i)).toBeInTheDocument());
        expect(verifyAction).toHaveBeenCalledWith('shop.acme.com');
    });
});

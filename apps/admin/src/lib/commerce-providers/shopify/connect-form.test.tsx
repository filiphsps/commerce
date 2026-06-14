import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/utils/test/react';

const { mockTest } = vi.hoisted(() => ({ mockTest: vi.fn() }));
// Relative mock — connect-form imports its action as `./actions` (no @/app/* alias exists).
vi.mock('./actions', () => ({ testShopifyConnection: mockTest }));
vi.mock('@nordcom/nordstar', () => ({
    Button: ({ children, onClick, disabled, ...p }: any) => (
        <button onClick={onClick} disabled={disabled} {...p}>
            {children}
        </button>
    ),
    Input: ({ label, value, onChange, ...p }: any) => (
        <input aria-label={label} value={value} onChange={onChange} {...p} />
    ),
    Label: ({ children }: any) => <span>{children}</span>,
    Details: ({ children }: any) => <details open>{children}</details>,
}));

import { useState } from 'react';
import { ShopifyConnectForm } from './connect-form';

afterEach(() => vi.clearAllMocks());

// The form is controlled — `value` must echo edits back, exactly as NewShopWizard drives it via
// setConnectValues. A static no-op onChange would leave inputs empty and keep the Test button disabled,
// so the harness lifts edits into local state and feeds them back as `value`.
function Harness({ onTestResult }: { onTestResult: (ok: boolean) => void }) {
    const [value, setValue] = useState<Record<string, string>>({});
    return <ShopifyConnectForm value={value} onChange={setValue} onTestResult={onTestResult} />;
}

const setup = () => {
    const onTestResult = vi.fn();
    render(<Harness onTestResult={onTestResult} />);
    return { onTestResult };
};

/** Fill the three required credential fields so the Test button enables. */
const fillCredentials = () => {
    fireEvent.change(screen.getByLabelText('Store domain'), { target: { value: 'acme.myshopify.com' } });
    fireEvent.change(screen.getByLabelText('Public access token'), { target: { value: 'pub' } });
    fireEvent.change(screen.getByLabelText('Private access token'), { target: { value: 'sec' } });
};

describe('ShopifyConnectForm', () => {
    it('keeps Test disabled until all three credential fields are filled', () => {
        setup();
        const button = () => screen.getByRole('button', { name: /test connection/i }) as HTMLButtonElement;
        expect(button().disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Store domain'), { target: { value: 'acme.myshopify.com' } });
        fireEvent.change(screen.getByLabelText('Public access token'), { target: { value: 'pub' } });
        // Still disabled — the private token (the load-bearing secret) is required too.
        expect(button().disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Private access token'), { target: { value: 'sec' } });
        expect(button().disabled).toBe(false);
    });

    it('runs the connection test and reports success', async () => {
        mockTest.mockResolvedValue({ ok: true, shopName: 'Acme' });
        const { onTestResult } = setup();
        fillCredentials();
        fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => expect(onTestResult).toHaveBeenCalledWith(true));
        expect(screen.getByText(/Acme/)).toBeTruthy();
        // The ping receives only the public half.
        expect(mockTest).toHaveBeenCalledWith({ storeDomain: 'acme.myshopify.com', publicToken: 'pub' });
    });

    it('reports a failed test', async () => {
        mockTest.mockResolvedValue({ ok: false, error: 'bad token' });
        const { onTestResult } = setup();
        fillCredentials();
        fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => expect(screen.getByText(/bad token/)).toBeTruthy());
        expect(onTestResult).toHaveBeenLastCalledWith(false);
    });

    it('invalidates a prior pass when a field changes', async () => {
        mockTest.mockResolvedValue({ ok: true, shopName: 'Acme' });
        const { onTestResult } = setup();
        fillCredentials();
        fireEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => expect(onTestResult).toHaveBeenCalledWith(true));
        fireEvent.change(screen.getByLabelText('Public access token'), { target: { value: 'pub2' } });
        expect(onTestResult).toHaveBeenLastCalledWith(false);
    });

    it('re-shows the confirmation when mounted with a persisted verified verdict', () => {
        render(
            <ShopifyConnectForm
                value={{ storeDomain: 'acme.myshopify.com', publicToken: 'pub', privateToken: 'sec' }}
                onChange={() => {}}
                onTestResult={() => {}}
                verified
            />,
        );
        expect(screen.getByText(/connection verified/i)).toBeTruthy();
    });

    it('exposes a disabled OAuth method option', () => {
        setup();
        const oauth = screen.getByRole('button', { name: /oauth/i });
        expect((oauth as HTMLButtonElement).disabled).toBe(true);
    });
});

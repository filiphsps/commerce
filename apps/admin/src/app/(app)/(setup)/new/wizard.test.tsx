import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/utils/test/react';

const { mockCheck, mockCreate } = vi.hoisted(() => ({ mockCheck: vi.fn(), mockCreate: vi.fn() }));
// The wizard imports only these two from its route actions (the connect form owns the test action).
vi.mock('./actions', () => ({
    checkDomainAvailability: mockCheck,
    createShop: mockCreate,
}));
vi.mock('@nordcom/nordstar', () => ({
    Accented: ({ children }: any) => <span>{children}</span>,
    Button: ({ children, onClick, disabled, ...p }: any) => (
        <button onClick={onClick} disabled={disabled} {...p}>
            {children}
        </button>
    ),
    Card: ({ children }: any) => <section>{children}</section>,
    Heading: ({ children }: any) => <h1>{children}</h1>,
    Input: ({ label, value, onChange, ...p }: any) => (
        <input aria-label={label} value={value} onChange={onChange} {...p} />
    ),
    Label: ({ children }: any) => <span>{children}</span>,
    Details: ({ children }: any) => <details open>{children}</details>,
}));
// Render the Shopify connect step as a stub that can flip the connection gate.
vi.mock('@/lib/commerce-providers/registry', () => ({
    PROVIDER_ORDER: ['shopify'],
    COMMERCE_PROVIDERS: {
        shopify: {
            id: 'shopify',
            label: 'Shopify',
            ConnectForm: ({ onTestResult }: any) => (
                <button type="button" onClick={() => onTestResult(true)}>
                    mark-connected
                </button>
            ),
        },
    },
}));

import { NewShopWizard } from './wizard';

afterEach(() => vi.clearAllMocks());

const fillBasicsAndAdvance = async () => {
    mockCheck.mockResolvedValue({ available: true });
    fireEvent.change(screen.getByLabelText('Shop name'), { target: { value: 'Acme' } });
    const domain = screen.getByLabelText('Customer-facing domain');
    fireEvent.change(domain, { target: { value: 'shop.acme.com' } });
    fireEvent.blur(domain);
    await waitFor(() => expect(screen.getByText(/available/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
};

describe('NewShopWizard', () => {
    it('gates Basics → Connect on a valid, available domain', async () => {
        render(<NewShopWizard />);
        // Next is disabled before a domain is checked.
        expect((screen.getByRole('button', { name: /^next$/i }) as HTMLButtonElement).disabled).toBe(true);
        await fillBasicsAndAdvance();
        // The always-rendered heading also contains "connect", so target the Connect step's provider label.
        expect(screen.getByText(/connect shopify/i)).toBeTruthy();
    });

    it('walks the full happy path and calls createShop (skipping branding)', async () => {
        render(<NewShopWizard />);
        await fillBasicsAndAdvance();
        // Connect step: Next disabled until connected.
        expect((screen.getByRole('button', { name: /^next$/i }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: /mark-connected/i }));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
        // Branding step: skip.
        fireEvent.click(screen.getByRole('button', { name: /skip/i }));
        // Review step: create.
        mockCreate.mockResolvedValue(undefined);
        fireEvent.click(screen.getByRole('button', { name: /create shop/i }));
        await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
        const arg = mockCreate.mock.calls[0]![0];
        expect(arg.name).toBe('Acme');
        expect(arg.domain).toBe('shop.acme.com');
        expect(arg.provider.type).toBe('shopify');
        expect(arg.branding).toBeNull();
    });

    it('discards a stale availability result for a since-edited domain', async () => {
        render(<NewShopWizard />);
        const domain = screen.getByLabelText('Customer-facing domain');
        let resolveStale: (value: { available: boolean }) => void = () => {};
        mockCheck.mockReturnValueOnce(new Promise<{ available: boolean }>((resolve) => (resolveStale = resolve)));

        fireEvent.change(domain, { target: { value: 'first.acme.com' } });
        fireEvent.blur(domain); // starts the check; result is still pending
        fireEvent.change(domain, { target: { value: 'second.acme.com' } }); // supersedes it before it resolves
        resolveStale({ available: true }); // late "available" verdict for the abandoned first domain

        await waitFor(() => expect(screen.queryByText(/is available/i)).toBeNull());
        // Next stays disabled — the current domain was never confirmed available.
        expect((screen.getByRole('button', { name: /^next$/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('surfaces a createShop failure on the review step', async () => {
        render(<NewShopWizard />);
        await fillBasicsAndAdvance();
        fireEvent.click(screen.getByRole('button', { name: /mark-connected/i }));
        fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
        fireEvent.click(screen.getByRole('button', { name: /skip/i }));
        mockCreate.mockResolvedValue({ ok: false, error: 'domain taken' });
        fireEvent.click(screen.getByRole('button', { name: /create shop/i }));
        await waitFor(() => expect(screen.getByText(/domain taken/)).toBeTruthy());
    });
});

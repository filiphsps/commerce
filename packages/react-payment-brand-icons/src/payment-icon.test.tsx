import { render, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { __resetUnknownWarned, PaymentIcon } from './payment-icon';

describe('PaymentIcon', () => {
    it('resolves a canonical slug and renders the matching icon', async () => {
        __resetUnknownWarned();
        const { container } = render(
            <Suspense fallback={<span data-testid="loading" />}>
                <PaymentIcon name="visa" />
            </Suspense>,
        );
        await waitFor(() => expect(container.querySelector('svg')).toBeTruthy());
        const title = container.querySelector('title');
        expect(title?.textContent).toBe('Visa');
    });

    it('resolves an alias to its canonical slug', async () => {
        __resetUnknownWarned();
        const { container } = render(
            <Suspense fallback={<span data-testid="loading" />}>
                <PaymentIcon name="amex" />
            </Suspense>,
        );
        await waitFor(() => expect(container.querySelector('svg')).toBeTruthy());
        expect(container.querySelector('title')?.textContent).toBe('American Express');
    });

    it('renders the fallback for an unknown name and warns once in dev', async () => {
        __resetUnknownWarned();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { findByTestId } = render(
            <Suspense fallback={<span />}>
                <PaymentIcon name="__not_a_real_icon__" fallback={<span data-testid="fb" />} />
            </Suspense>,
        );
        await findByTestId('fb');
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it('forwards props to the resolved icon', async () => {
        __resetUnknownWarned();
        const { container } = render(
            <Suspense fallback={<span />}>
                <PaymentIcon name="visa" size={64} chrome="none" />
            </Suspense>,
        );
        await waitFor(() => expect(container.querySelector('svg')).toBeTruthy());
        const svg = container.querySelector('svg')!;
        expect(svg.getAttribute('width')).toBe('64');
        expect(svg.getAttribute('height')).toBe('64');
        expect(container.querySelectorAll('svg > path[data-rpbi-chrome]').length).toBe(0);
    });
});

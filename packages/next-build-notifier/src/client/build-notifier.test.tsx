import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BuildNotifier } from './build-notifier';
import { useBuildNotification } from './context';
import { BuildNotifierProvider } from './provider';

describe('BuildNotifierProvider + BuildNotifier', () => {
    it('exposes updateAvailable through the render-prop', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        render(
            <BuildNotifierProvider currentBuildId="OLD" fetcher={fetcher}>
                <BuildNotifier>{(s) => <div>{s.updateAvailable ? 'update' : 'current'}</div>}</BuildNotifier>
            </BuildNotifierProvider>,
        );
        await waitFor(() => expect(screen.getByText('update')).toBeTruthy());
    });

    it('dismiss through the hook hides the update in the same tree', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        function Child() {
            const s = useBuildNotification();
            return (
                <div>
                    <span>{s.updateAvailable && !s.dismissed ? 'show' : 'hidden'}</span>
                    <button type="button" onClick={s.dismiss}>
                        dismiss
                    </button>
                </div>
            );
        }
        render(
            <BuildNotifierProvider currentBuildId="OLD" fetcher={fetcher}>
                <Child />
            </BuildNotifierProvider>,
        );
        await waitFor(() => expect(screen.getByText('show')).toBeTruthy());
        fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));
        await waitFor(() => expect(screen.getByText('hidden')).toBeTruthy());
    });

    it('useBuildNotification throws outside a provider', () => {
        const Bad = () => {
            useBuildNotification();
            return null;
        };
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<Bad />)).toThrow(/within a <BuildNotifierProvider>/);
        spy.mockRestore();
    });
});

import { describe, expect, it } from 'vitest';
import { renderRSC } from '@/utils/test/rsc';

describe('utils/test/rsc', () => {
    describe('renderRSC', () => {
        it('renders an async server component', async () => {
            const Async = async () => <div>hello async</div>;
            const ui = await renderRSC(() => Async());
            expect(ui.container.textContent).toBe('hello async');
            ui.unmount();
        });

        it('renders a sync-returning factory', async () => {
            const ui = await renderRSC(() => <div>hello sync</div>);
            expect(ui.container.textContent).toBe('hello sync');
            ui.unmount();
        });

        it('propagates errors thrown inside the factory', async () => {
            const factory = async () => {
                throw new Error('boom');
            };
            await expect(renderRSC(factory)).rejects.toThrow('boom');
        });
    });
});

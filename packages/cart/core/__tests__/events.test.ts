import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../src/events';

const silentLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

const flushMicrotasks = async () => {
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
};

describe('event bus', () => {
    it('delivers to all matching handlers asynchronously', async () => {
        const bus = createEventBus({ logger: silentLogger });
        const seen: string[] = [];
        bus.on('cart.updated', (e) => seen.push(`u:${e.cart.id}`));
        bus.on('cart.cleared', () => seen.push('cleared'));
        bus.emit({
            type: 'cart.updated',
            cart: { id: 'c1' } as never,
            mutation: { kind: 'add-line', variantId: 'v', quantity: 1 },
            source: 'self',
        });
        bus.emit({ type: 'cart.cleared' });
        await flushMicrotasks();
        expect(seen).toEqual(['u:c1', 'cleared']);
    });

    it('swallows handler errors and logs warn', async () => {
        const warn = vi.fn();
        const bus = createEventBus({ logger: { ...silentLogger, warn } });
        bus.on('cart.cleared', () => {
            throw new Error('bad handler');
        });
        bus.emit({ type: 'cart.cleared' });
        await flushMicrotasks();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('cart event handler failed'), expect.any(Object));
    });

    it('unsubscribes via returned dispose', async () => {
        const bus = createEventBus({ logger: silentLogger });
        const seen: string[] = [];
        const off = bus.on('cart.cleared', () => seen.push('x'));
        off();
        bus.emit({ type: 'cart.cleared' });
        await flushMicrotasks();
        expect(seen).toEqual([]);
    });
});

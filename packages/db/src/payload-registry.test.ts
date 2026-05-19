import type { Payload } from 'payload';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetPayloadRegistryForTests, getRegisteredPayload, registerPayload } from './payload-registry';

const fakePayload = { __fake: true } as const;

describe('payload-registry', () => {
    beforeEach(() => {
        _resetPayloadRegistryForTests();
    });

    afterEach(() => {
        _resetPayloadRegistryForTests();
    });

    it('throws a named error before any getter is registered', async () => {
        await expect(getRegisteredPayload()).rejects.toThrow(/No Payload getter registered/i);
    });

    it('invokes the registered getter and returns its resolved value', async () => {
        const getter = vi.fn().mockResolvedValue(fakePayload);
        registerPayload(getter);

        await expect(getRegisteredPayload()).resolves.toBe(fakePayload);
        expect(getter).toHaveBeenCalledTimes(1);
    });

    it('calls the getter on every access (delegates caching to the getter)', async () => {
        const getter = vi.fn().mockResolvedValue(fakePayload);
        registerPayload(getter);

        await getRegisteredPayload();
        await getRegisteredPayload();
        await getRegisteredPayload();

        expect(getter).toHaveBeenCalledTimes(3);
    });

    it('the last registerPayload call wins (later registration overrides earlier)', async () => {
        const first = vi.fn().mockResolvedValue({ first: true });
        const second = vi.fn().mockResolvedValue({ second: true });

        registerPayload(first);
        registerPayload(second);

        await expect(getRegisteredPayload()).resolves.toEqual({ second: true });
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('_resetPayloadRegistryForTests restores the no-getter state', async () => {
        registerPayload(() => Promise.resolve(fakePayload as unknown as Payload));
        _resetPayloadRegistryForTests();

        await expect(getRegisteredPayload()).rejects.toThrow(/No Payload getter registered/i);
    });

    it('survives re-import of the module via Symbol.for slot (cross-graph)', async () => {
        // Simulate HMR module re-evaluation by clearing Vitest's module cache
        // and re-importing. The slot is keyed by Symbol.for so re-evaluation
        // of this module finds the existing globalThis cell and does not reset
        // it — the getter registered by copy A is visible from copy B.
        // (The real Turbopack multi-graph case is process-level; same reasoning
        // applies but cannot be unit-tested here.)
        const a = await import('./payload-registry');
        a.registerPayload(() => Promise.resolve(fakePayload as unknown as Payload));

        vi.resetModules();
        const b = await import('./payload-registry');

        await expect(b.getRegisteredPayload()).resolves.toBe(fakePayload);
    });
});

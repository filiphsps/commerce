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
        registerPayload(() => Promise.resolve(fakePayload as never));
        _resetPayloadRegistryForTests();

        await expect(getRegisteredPayload()).rejects.toThrow(/No Payload getter registered/i);
    });

    it('survives re-import of the module via Symbol.for slot (cross-graph)', async () => {
        // Simulate a second module-graph copy of this file by clearing the
        // module cache and re-importing. The slot is keyed by Symbol.for, so
        // both copies observe the same globalThis entry — the getter set by
        // copy A must be visible from copy B.
        const a = await import('./payload-registry');
        a.registerPayload(() => Promise.resolve(fakePayload as never));

        vi.resetModules();
        const b = await import('./payload-registry');

        await expect(b.getRegisteredPayload()).resolves.toBe(fakePayload);
    });
});

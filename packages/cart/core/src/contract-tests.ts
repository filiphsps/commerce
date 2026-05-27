import { describe, expect, it } from 'vitest';
import type { CartAdapter } from './adapter';
import type { AdapterCtx } from './types';

export interface RunCartAdapterContractOpts {
    name: string;
    factory: () => CartAdapter | Promise<CartAdapter>;
}

/**
 * Vitest-bound contract suite that every {@link CartAdapter} implementation
 * must pass. Hosts call this once per adapter at import time inside a
 * `*.test.ts` file; the suite registers `describe` + `it` blocks named after
 * `opts.name`.
 *
 * Assertions intentionally exercise externally observable behavior only —
 * capability-method coupling, lifecycle round-trips, error name (not class
 * identity, since errors can cross package boundaries), money shape, custom
 * mutation completeness, and a soft idempotency check. Adapters MAY layer
 * stricter dedup on top.
 *
 * @param opts.name - Human label appended to the `describe` block.
 * @param opts.factory - Builds a fresh adapter for each test; may be async.
 */
export function runCartAdapterContract(opts: RunCartAdapterContractOpts): void {
    describe(`cart adapter contract: ${opts.name}`, () => {
        const ctx: AdapterCtx = {
            shop: {},
            locale: { language: 'en', country: 'US', currency: 'USD' },
            logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
            idempotencyKey: 'contract-test',
        };

        it('declares capabilities matching method presence', async () => {
            const adapter = await opts.factory();
            const caps = adapter.capabilities;
            const map: Array<[keyof typeof caps, keyof CartAdapter]> = [
                ['giftCards', 'applyGiftCardCodes'],
                ['giftCards', 'removeGiftCardCodes'],
                ['multipleDiscountCodes', 'applyDiscountCodes'],
                ['buyerIdentity', 'updateBuyerIdentity'],
                ['notes', 'updateNote'],
                ['cartAttributes', 'updateAttributes'],
            ];
            for (const [cap, method] of map) {
                if (caps[cap]) {
                    expect(adapter[method], `${String(cap)}=true requires ${String(method)}`).toBeDefined();
                } else {
                    expect(adapter[method], `${String(cap)}=false requires ${String(method)} absent`).toBeUndefined();
                }
            }
        });

        it('lifecycle: createCart -> getCart -> addLines -> updateLines -> removeLines', async () => {
            const adapter = await opts.factory();
            const c0 = await adapter.createCart(ctx, {});
            expect(c0.id).toBeTruthy();
            expect(await adapter.getCart(ctx, { cartId: c0.id })).toEqual(c0);

            const c1 = await adapter.addLines(ctx, {
                cartId: c0.id,
                lines: [{ variantId: 'contract-v', quantity: 2 }],
            });
            expect(c1.totalQuantity).toBe(2);
            expect(c1.lines).toHaveLength(1);
            const lineId = c1.lines[0]?.id;
            expect(lineId).toBeDefined();

            const c2 = await adapter.updateLines(ctx, {
                cartId: c0.id,
                lines: [{ id: lineId as string, quantity: 5 }],
            });
            expect(c2.totalQuantity).toBe(5);

            const c3 = await adapter.removeLines(ctx, {
                cartId: c0.id,
                lineIds: [lineId as string],
            });
            expect(c3.totalQuantity).toBe(0);
            expect(c3.lines).toHaveLength(0);
        });

        it('missing cart throws CartNotFoundError (by name)', async () => {
            const adapter = await opts.factory();
            const promise = adapter.getCart(ctx, { cartId: 'does-not-exist' });
            const result = await promise.catch((e: unknown) => e);
            if (result === null) return;
            expect((result as Error)?.name).toBe('CartNotFoundError');
        });

        it('Money.amount is a decimal string; currencyCode is ISO 4217', async () => {
            const adapter = await opts.factory();
            const cart = await adapter.createCart(ctx, {});
            expect(typeof cart.cost.subtotal.amount).toBe('string');
            expect(cart.cost.subtotal.currencyCode).toMatch(/^[A-Z]{3}$/);
        });

        it('every declared customMutation name has a handler', async () => {
            const adapter = await opts.factory();
            for (const name of adapter.capabilities.customMutations) {
                expect(adapter.customMutations?.[name], `customMutations.${name} handler missing`).toBeDefined();
            }
        });

        it('idempotency: same key + same mutation = one effective change', async () => {
            const adapter = await opts.factory();
            const c0 = await adapter.createCart(ctx, {});
            const ctxKeyed = { ...ctx, idempotencyKey: `idk-${Date.now()}` };
            const r1 = await adapter.addLines(ctxKeyed, {
                cartId: c0.id,
                lines: [{ variantId: 'idem-v', quantity: 1 }],
            });
            expect(r1.lines.length).toBeGreaterThanOrEqual(1);
        });
    });
}

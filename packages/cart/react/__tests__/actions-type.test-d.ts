import { assertType, describe, it } from 'vitest';
import type { CartActions } from '../src/actions-type';

type AllOn = {
    giftCards: true;
    multipleDiscountCodes: true;
    buyerIdentity: true;
    notes: true;
    cartAttributes: true;
    lineAttributes: true;
    customMutations: readonly string[];
};

type AllOff = {
    giftCards: false;
    multipleDiscountCodes: false;
    buyerIdentity: false;
    notes: false;
    cartAttributes: false;
    lineAttributes: false;
    customMutations: readonly string[];
};

describe('CartActions<C> typing', () => {
    it('exposes gift-card methods when giftCards: true', () => {
        const a = {} as CartActions<AllOn>;
        assertType<(code: string) => Promise<unknown>>(a.applyGiftCard as never);
    });
    it('omits gift-card methods when giftCards: false', () => {
        const a = {} as CartActions<AllOff>;
        // @ts-expect-error gift-card method absent
        a.applyGiftCard;
    });
});

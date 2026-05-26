import { TodoError } from '@nordcom/commerce-errors';

import type { CartProviderAdapter } from '../types';

const notImplemented = (method: string): never => {
    throw new TodoError(`shopifyCartAdapter.${method} not implemented yet (Task 2.x)`);
};

const shopifyCartAdapter: CartProviderAdapter = {
    type: 'shopify',
    getCart: () => notImplemented('getCart'),
    createCart: () => notImplemented('createCart'),
    addLines: () => notImplemented('addLines'),
    updateLines: () => notImplemented('updateLines'),
    removeLines: () => notImplemented('removeLines'),
    applyDiscountCodes: () => notImplemented('applyDiscountCodes'),
    applyGiftCardCodes: () => notImplemented('applyGiftCardCodes'),
    removeGiftCardCodes: () => notImplemented('removeGiftCardCodes'),
    updateBuyerIdentity: () => notImplemented('updateBuyerIdentity'),
    updateNote: () => notImplemented('updateNote'),
    updateAttributes: () => notImplemented('updateAttributes'),
};

export default shopifyCartAdapter;

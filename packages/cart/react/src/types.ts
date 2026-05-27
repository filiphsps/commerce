import type { BuyerIdentity, Cart, CartCapabilities, CartExt, CartLine, CartMutation } from '@nordcom/cart-core';

export type CartStatus = 'idle' | 'loading' | 'mutating' | 'error';

export type PendingMutation = {
    id: string;
    mutation: CartMutation;
    status: 'predicted' | 'in-flight' | 'failed';
    error?: string;
    startedAt: number;
    tempLineId?: string;
};

export type ClientAuthBridge = {
    useBuyerIdentity(): { identity: BuyerIdentity | null; updatedAt: number };
};

export type KernelSnapshot<C extends CartCapabilities = CartCapabilities> = {
    type: string;
    capabilities: C;
    customMutationNames: readonly string[];
};

export type PredictorCtx<TExt extends CartExt = {}> = {
    confirmed: Cart<TExt> | null;
    projection: Cart<TExt>;
    pending: PendingMutation[];
};

export type LinePredictor<TExt extends CartExt = {}> = (
    mutation: CartMutation,
    ctx: PredictorCtx<TExt>,
) => Partial<CartLine<TExt['line']>> | null;

export type CartPredictor<TExt extends CartExt = {}> = (
    projection: Cart<TExt>,
    mutation: CartMutation,
    ctx: PredictorCtx<TExt>,
) => Cart<TExt>;

export type AppCartConfig<C extends CartCapabilities = CartCapabilities, E extends CartExt = {}> = {
    caps: C;
    ext: E;
};

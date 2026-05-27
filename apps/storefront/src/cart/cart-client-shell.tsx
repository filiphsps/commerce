'use client';

import type { Cart, MutationEnvelope } from '@nordcom/cart-core';
import {
    CartProvider,
    cachePredictor,
    quantitySumPredictor,
    snapshotPredictor,
    subtotalPredictor,
} from '@nordcom/cart-react';
import type { ReactNode } from 'react';

import type { AppCartCaps } from './caps';
import { clientAuthBridge } from './client-auth';

const PREDICTORS = {
    line: [snapshotPredictor(), cachePredictor({ get: () => null })],
    cart: [quantitySumPredictor(), subtotalPredictor()],
};

export interface CartClientShellProps {
    kernelSnapshot: {
        type: string;
        capabilities: AppCartCaps;
        customMutationNames: readonly string[];
    };
    submitMutation: (envelope: MutationEnvelope) => Promise<unknown>;
    initialCart: Cart | null;
    shopId: string;
    children: ReactNode;
}

export function CartClientShell({
    kernelSnapshot,
    submitMutation,
    initialCart,
    shopId,
    children,
}: CartClientShellProps) {
    return (
        <CartProvider
            kernelSnapshot={kernelSnapshot}
            submitMutation={submitMutation as never}
            initialCart={initialCart}
            shopId={shopId}
            predictors={PREDICTORS}
            clientAuthBridge={clientAuthBridge}
        >
            {children}
        </CartProvider>
    );
}

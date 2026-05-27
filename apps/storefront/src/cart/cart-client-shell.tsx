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

/**
 * Props for `CartClientShell`. The kernel snapshot and `submitMutation` are
 * typically passed down from the Server Component that owns cart I/O, keeping
 * all server-side cart logic outside the client bundle.
 */
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

/**
 * Client boundary that mounts the cart provider with optimistic predictors
 * and the app's auth bridge. All actual cart mutation logic is delegated to
 * the `submitMutation` Server Action passed from the parent Server Component.
 *
 * @param kernelSnapshot - The serialized cart kernel state used to hydrate the provider.
 * @param submitMutation - The Server Action that processes cart mutation envelopes.
 * @param initialCart - The initial cart snapshot from the server render, or `null`.
 * @param shopId - The Shopify shop ID used by the cart provider for API calls.
 * @param children - The application subtree that can access the cart context.
 * @returns The rendered `CartProvider` wrapping the children.
 */
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

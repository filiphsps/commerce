'use client';

import type { CartMutation, ProductSnapshot } from '@nordcom/cart-core';
import type { ReactNode } from 'react';

type ActionKind = CartMutation['kind'];

export interface CartFormProps {
    action: ActionKind;
    variantId?: string;
    quantity?: number;
    lineId?: string;
    code?: string;
    note?: string;
    snapshot?: ProductSnapshot;
    formAction: (formData: FormData) => Promise<unknown> | unknown;
    children: ReactNode;
}

export function CartForm(props: CartFormProps) {
    const { action, variantId, quantity, lineId, code, note, snapshot, formAction, children } = props;
    return (
        <form action={formAction as never}>
            <input type="hidden" name="kind" value={action} />
            {variantId !== undefined ? <input type="hidden" name="variantId" value={variantId} /> : null}
            {quantity !== undefined ? <input type="hidden" name="quantity" value={String(quantity)} /> : null}
            {lineId !== undefined ? <input type="hidden" name="lineId" value={lineId} /> : null}
            {code !== undefined ? <input type="hidden" name="code" value={code} /> : null}
            {note !== undefined ? <input type="hidden" name="note" value={note} /> : null}
            {snapshot ? <input type="hidden" name="snapshot" value={JSON.stringify(snapshot)} /> : null}
            {children}
        </form>
    );
}

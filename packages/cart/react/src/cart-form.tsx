'use client';

import type { CartMutation, ProductSnapshot } from '@nordcom/cart-core';
import type { ReactNode } from 'react';

type ActionKind = CartMutation['kind'];

/**
 * Props for {@link CartForm}. Each field maps to a hidden `<input>` the cart
 * server action reads from `FormData`; only `action`, `formAction`, and
 * `children` are required for every mutation kind.
 */
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

/**
 * Renders a `<form>` that encodes a cart mutation as hidden inputs consumed
 * by a cart server action. Pass `action` to identify the mutation kind and
 * supply the relevant optional fields for that kind.
 *
 * @param props.action - Cart mutation kind; determines which hidden inputs are rendered.
 * @param props.variantId - Shopify variant GID; required for `add-line` mutations.
 * @param props.quantity - Item quantity; used by `add-line` and `update-line`.
 * @param props.lineId - Cart line id; required for `update-line` and `remove-line`.
 * @param props.code - Discount or gift-card code for apply/remove operations.
 * @param props.note - Cart note text for `update-note` mutations.
 * @param props.snapshot - Inline product snapshot forwarded for optimistic UI on `add-line`.
 * @param props.formAction - Server action (or handler) called on submit.
 * @param props.children - Trigger element, typically a submit button.
 * @returns A `<form>` element with hidden mutation inputs and the provided children.
 * @example
 * ```tsx
 * <CartForm action="add-line" variantId={variantId} quantity={1} formAction={addToCartAction}>
 *   <button type="submit">Add to cart</button>
 * </CartForm>
 * ```
 */
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

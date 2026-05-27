import type { Cart, CartMutation } from '@nordcom/cart-core';
import type { PendingMutation } from './types';

export type QueueState = {
    confirmed: Cart | null;
    pending: PendingMutation[];
};

export type QueueAction =
    | { type: 'setInitial'; cart: Cart | null }
    | { type: 'enqueue'; id: string; mutation: CartMutation }
    | { type: 'startInFlight'; id: string }
    | { type: 'confirm'; id: string; cart: Cart }
    | { type: 'fail'; id: string; message: string }
    | { type: 'externalUpdate'; cart: Cart }
    | { type: 'clearFailed' };

/**
 * Produce the empty starting state for the cart mutation queue. Confirmed
 * cart is null until {@link queueReducer} processes a `setInitial` action.
 *
 * @returns A fresh {@link QueueState} with no confirmed cart and no pending
 *   mutations.
 */
export function initialQueueState(): QueueState {
    return { confirmed: null, pending: [] };
}

let tempSerial = 1;

/**
 * Allocate a process-unique placeholder id for an optimistic add-line. The
 * `temp:` prefix lets the projection + reducer distinguish predicted lines
 * from server-issued ones during cascade-cancel checks.
 *
 * @returns A new temp line id (e.g. `temp:line-7`).
 */
function newTempLineId(): string {
    return `temp:line-${tempSerial++}`;
}

/**
 * Extract the line id a pending mutation depends on, if any. Used by
 * cascade-cancel passes to find downstream operations that target a line
 * that is about to disappear.
 *
 * @param p - Pending mutation entry.
 * @returns The referenced line id, or `null` when the mutation does not
 *   target a specific line.
 */
function lineIdReferenced(p: PendingMutation): string | null {
    switch (p.mutation.kind) {
        case 'update-line':
        case 'remove-line':
            return p.mutation.lineId;
        default:
            return null;
    }
}

/**
 * Walk the pending queue and fail any mutations that reference the just-failed
 * add-line's temp id. Keeps the queue self-consistent: once the line never
 * existed on the server, dependent updates/removes can never succeed either.
 *
 * @param pending - Current pending queue (already containing the failed entry).
 * @param failedTempLineId - The `tempLineId` of the failed add-line, or
 *   `undefined` when no cascade is needed.
 * @returns A new pending array with dependents marked failed.
 */
function cascadeFailDependents(pending: PendingMutation[], failedTempLineId: string | undefined): PendingMutation[] {
    if (!failedTempLineId) return pending;
    return pending.map((p) => {
        if (p.status === 'failed') return p;
        const ref = lineIdReferenced(p);
        if (ref === failedTempLineId) return { ...p, status: 'failed', error: 'precondition-cart-state' };
        return p;
    });
}

/**
 * Check whether a real (non-temp) line id is present in the cart.
 *
 * @param cart - Cart to inspect.
 * @param lineId - Line id to look for.
 * @returns `true` if the line exists.
 */
function lineExists(cart: Cart, lineId: string): boolean {
    return cart.lines.some((l) => l.id === lineId);
}

/**
 * After a cross-tab `externalUpdate`, fail any pending mutations whose
 * target line vanished from the new confirmed cart. Temp ids are exempt —
 * they are predicted-only and never appear in server state until confirm.
 *
 * @param pending - Current pending queue.
 * @param cart - New confirmed cart from the external update.
 * @returns A new pending array with orphaned mutations marked failed.
 */
function cascadeFailMissingLines(pending: PendingMutation[], cart: Cart): PendingMutation[] {
    return pending.map((p) => {
        if (p.status === 'failed') return p;
        const ref = lineIdReferenced(p);
        if (ref && !ref.startsWith('temp:') && !lineExists(cart, ref)) {
            return { ...p, status: 'failed', error: 'precondition-cart-state' };
        }
        return p;
    });
}

/**
 * Pure reducer driving the mutation queue: appends predicted entries, marks
 * them in-flight, confirms or fails them, and reconciles with cross-tab
 * broadcasts. Cascade-cancel logic keeps optimistic state from drifting out
 * of sync when a mutation chain breaks mid-way.
 *
 * @param state - Previous queue state.
 * @param action - Discriminated {@link QueueAction} to apply.
 * @returns The next queue state. The function is referentially safe: it
 *   never mutates `state` or `state.pending`.
 */
export function queueReducer(state: QueueState, action: QueueAction): QueueState {
    switch (action.type) {
        case 'setInitial':
            return { ...state, confirmed: action.cart };
        case 'enqueue': {
            const isAddLine = action.mutation.kind === 'add-line';
            const tempLineId = isAddLine ? newTempLineId() : undefined;
            const entry: PendingMutation = {
                id: action.id,
                mutation: action.mutation,
                status: 'predicted',
                startedAt: Date.now(),
                ...(tempLineId ? { tempLineId } : {}),
            };
            return { ...state, pending: [...state.pending, entry] };
        }
        case 'startInFlight':
            return {
                ...state,
                pending: state.pending.map((p) => (p.id === action.id ? { ...p, status: 'in-flight' } : p)),
            };
        case 'confirm':
            return {
                confirmed: action.cart,
                pending: state.pending.filter((p) => p.id !== action.id),
            };
        case 'fail': {
            const failedEntry = state.pending.find((p) => p.id === action.id);
            const updated = state.pending.map((p) =>
                p.id === action.id ? { ...p, status: 'failed' as const, error: action.message } : p,
            );
            return { ...state, pending: cascadeFailDependents(updated, failedEntry?.tempLineId) };
        }
        case 'externalUpdate': {
            if (!state.confirmed || state.confirmed.id !== action.cart.id) return state;
            return {
                confirmed: action.cart,
                pending: cascadeFailMissingLines(state.pending, action.cart),
            };
        }
        case 'clearFailed':
            return { ...state, pending: state.pending.filter((p) => p.status !== 'failed') };
    }
}

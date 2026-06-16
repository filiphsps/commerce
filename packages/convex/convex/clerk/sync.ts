import type { Id } from '../_generated/dataModel';

/**
 * The shape of a `shopCollaborators` projection row this module computes: a `(shop, user)` grant with
 * its `permissions`. Deliberately a structural subset of the `shopCollaborators` table row (no `_id` /
 * `_creationTime`) so the same value is both what a reconcile compares CURRENT against and what the
 * webhook inserts. Kept pure (plain ids, no ctx) — these helpers are the projection of
 * (org membership × org's shops) → `shopCollaborators` (spec decisions #10/#11) and run identically in
 * a test, a mutation, or the webhook httpAction.
 */
export type CollaboratorRow = {
    shop: Id<'shops'>;
    user: Id<'users'>;
    permissions: string[];
};

/**
 * Decision #13 grants blanket `['admin']` for parity with the pre-Clerk single-permission model; Clerk
 * role granularity is mirrored on `orgMemberships.role` but not yet projected here.
 */
const DEFAULT_PERMISSIONS: readonly string[] = ['admin'];

/**
 * Computes the DESIRED `shopCollaborators` rows for one user across the shops their owning org grants —
 * the projection of a single org membership onto the shops that org owns (spec decisions #10/#11).
 * Pure: it never reads a ctx/db, so the webhook (which already holds the user's id and the org's shop
 * ids) and the unit tests share one deterministic mapping.
 *
 * One row is emitted per shop, each carrying `permissions` (default `['admin']`, decision #13). Passing
 * the same shop twice yields duplicate rows by design — de-duplication of the org's shop set is the
 * caller's responsibility, since this helper only fans a single membership across a given shop list.
 *
 * @param params - The projection inputs.
 * @param params.shopIds - The shops the user's org owns (one desired collaborator row each).
 * @param params.userId - The `users` row the membership resolves to.
 * @param params.permissions - Optional permission override applied to every emitted row; defaults to `['admin']`.
 * @returns One desired `{ shop, user, permissions }` row per entry in `shopIds`.
 */
export function desiredCollaboratorRows(params: {
    shopIds: Id<'shops'>[];
    userId: Id<'users'>;
    permissions?: string[];
}): CollaboratorRow[] {
    const permissions = params.permissions ?? [...DEFAULT_PERMISSIONS];
    return params.shopIds.map((shop) => ({ shop, user: params.userId, permissions: [...permissions] }));
}

/**
 * The create/delete plan reconciling a CURRENT `shopCollaborators` set against a DESIRED one. Both arms
 * are plain row arrays the caller applies (insert `toCreate`, delete the matching `toDelete` rows), so
 * the reconcile stays pure and side-effect-free.
 */
export type CollaboratorReconcileResult = {
    toCreate: CollaboratorRow[];
    toDelete: CollaboratorRow[];
};

/**
 * Reconciles ONE user's CURRENT projected `shopCollaborators` rows against the DESIRED set, returning
 * the `{ toCreate, toDelete }` deltas keyed by `shop`. Contract: this is a SINGLE-USER reconcile — the
 * set-difference keys only on `shop`, which is correct exactly when every `current` row belongs to
 * `userId`. A foreign-user row in `current` would otherwise suppress a legitimate `toCreate` (its shop
 * appears "present") or schedule a cross-user `toDelete`, so `current` is filtered to `userId` first;
 * its `shop` set is then what create/delete diff against. Within that one user, membership is decided
 * SOLELY by `shop` (the `by_shop_user` invariant grants at most one collaborator row per shop), so a
 * desired shop missing from current is a create and a current shop missing from desired is a delete.
 * Permission drift on a shop in both sets is intentionally NOT reconciled — every member gets the same
 * `['admin']` baseline (decision #13), so there is no per-shop permission to converge; role granularity
 * is a follow-up, not this set-difference.
 *
 * Pure: operates on plain arrays/objects only, so it is exercised directly in unit tests and reused by
 * the webhook httpAction that owns the actual inserts/deletes.
 *
 * @param params - The reconcile inputs.
 * @param params.userId - The single user this reconcile is scoped to; foreign-user `current` rows are ignored.
 * @param params.current - Existing projected `shopCollaborators` rows (may include other users' rows; filtered out).
 * @param params.desired - The target rows from {@link desiredCollaboratorRows} (all for `userId`).
 * @returns The rows to create and the rows to delete to make `userId`'s current rows match desired.
 */
export function reconcileCollaboratorRows(params: {
    userId: Id<'users'>;
    current: CollaboratorRow[];
    desired: CollaboratorRow[];
}): CollaboratorReconcileResult {
    const ownCurrent = params.current.filter((row) => row.user === params.userId);
    const currentShops = new Set(ownCurrent.map((row) => row.shop));
    const desiredShops = new Set(params.desired.map((row) => row.shop));

    const toCreate = params.desired.filter((row) => !currentShops.has(row.shop));
    const toDelete = ownCurrent.filter((row) => !desiredShops.has(row.shop));

    return { toCreate, toDelete };
}

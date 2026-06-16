import type { FeatureFlagBase, IdentityBase, OnlineShop, ReviewBase, UserBase } from '../models';

type Doc = Record<string, unknown>;

/**
 * Distinguishes plain data objects from class instances (e.g. `Date`) so the recursive strip only
 * descends into row data and never mangles rich values.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};

/**
 * Recursively strips backend-internal keys (`_id`, `__v`, `_creationTime`) from nested plain
 * objects and arrays. `_id`/`__v` cover legacy Mongo-shaped payloads; `_creationTime` is Convex's
 * system column. None of them are serializable contracts the RSC ↔ Client Component boundary
 * should ever see.
 *
 * @param value - Arbitrary document value; arrays and plain objects are traversed recursively,
 *   primitives and class instances are returned as-is.
 * @returns The input with all nested internal keys removed.
 */
const stripInternalsDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripInternalsDeep);
    if (!isPlainObject(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
        if (k === '_id' || k === '__v' || k === '_creationTime') continue;
        out[k] = stripInternalsDeep(v);
    }
    return out;
};

/**
 * Rehydrates the managed epoch-ms timestamps a Convex row carries into the `Date`-typed
 * `BaseTimestamps` contract the seam's consumers were written against. Values that are already
 * `Date`s (or absent) pass through untouched, so the mapper is idempotent.
 *
 * @param doc - A stripped row whose `createdAt`/`updatedAt` may be epoch-ms numbers.
 * @returns The same object with numeric managed timestamps converted to `Date`s.
 */
const hydrateTimestamps = <T extends Doc>(doc: T): T => {
    for (const key of ['createdAt', 'updatedAt'] as const) {
        const value = doc[key];
        if (typeof value === 'number') {
            (doc as Doc)[key] = new Date(value);
        }
    }
    return doc;
};

/**
 * Strip backend internals (`_id`, `__v`, `_creationTime`) and project the row's PUBLIC id onto the
 * string `id` field the `DocumentExtras` contract promises. The projection prefers, in order: an
 * existing `id` (never clobbered), the row's `legacyId` (the migrated Mongo `ObjectId` preserved on
 * shops and feature flags — the value every externally-persisted shop reference points at), and
 * finally the stringified `_id` (the Convex document id, the public id for the auth rows). The raw
 * Convex `_id` is therefore never surfaced as-is alongside `id`, and `legacyId` itself is consumed
 * by the projection rather than leaked.
 *
 * Recurses into nested plain objects and arrays so embedded internals are stripped too, and
 * rehydrates the top-level epoch-ms `createdAt`/`updatedAt` into `Date`s.
 */
export const stripInternals = <T extends Doc>(doc: T): Omit<T, '_id' | '__v'> & { id?: string } => {
    if (!doc) return doc;

    const {
        _id,
        __v: __v_,
        _creationTime: _creationTime_,
        legacyId,
        ...rest
    } = doc as { _id?: unknown; __v?: unknown; _creationTime?: unknown; legacyId?: unknown } & T;
    const out = hydrateTimestamps(stripInternalsDeep(rest) as Omit<T, '_id' | '__v'> & { id?: string } & Doc);
    const existingId = (out as { id?: unknown }).id;
    if (typeof existingId === 'undefined') {
        if (typeof legacyId === 'string' && legacyId.length > 0) {
            out.id = legacyId;
        } else if (_id != null) {
            out.id = typeof _id === 'string' ? _id : String(_id);
        }
    }
    return out;
};

/**
 * Map a Convex `shops` read (already merged with its joined flags, collaborators, and — on the
 * sensitive path — credentials) to the public `OnlineShop` shape.
 * - Drops the internal `_id`/`_creationTime` keys and projects `legacyId` onto the string `id`
 *   (the ~183-importer `shop.id` contract; the Convex `_id` is never surfaced).
 * - Defensively strips `commerceProvider.authentication.token` and `customers.clientSecret`. The
 *   masking BOUNDARY is structural — the Convex `shops` row physically cannot carry a secret, the
 *   secrets live in the split-out `shopCredentials` table — so for a well-formed public read this
 *   is a no-op; it exists belt-and-braces so a payload that had credentials attached upstream can
 *   never exit through the masked projection. Trusted server-only paths request
 *   `sensitiveData: true` on the service method, which routes around this masking.
 * - `collaborators` is a de-embedded join: each row is `{ user, permissions }` where `user` is a
 *   plain string id ref (see `ShopCollaborator`), never a nested user document.
 */
export const docToOnlineShop = (doc: Doc): OnlineShop => {
    const stripped = stripInternals(doc);
    if (!doc || !stripped) {
        return null as unknown as OnlineShop;
    }

    const cp = (stripped as { commerceProvider?: { type?: string; authentication?: Record<string, unknown> } })
        .commerceProvider;
    if (cp?.authentication) {
        const auth = { ...cp.authentication };
        delete auth.token;
        const customers = auth.customers as Record<string, unknown> | undefined;
        if (customers) {
            const { clientSecret: _clientSecret_, ...restCustomers } = customers;
            auth.customers = restCustomers;
        }
        return { ...stripped, commerceProvider: { ...cp, authentication: auth } } as unknown as OnlineShop;
    }
    return stripped as unknown as OnlineShop;
};

/**
 * Projects a Convex review read onto the public `ReviewBase` shape. The Convex function already
 * swapped the branded shop reference for the shop's public id under `shop`, so stripping internals
 * and rehydrating timestamps is the only transform that applies here.
 *
 * @param doc - Raw review payload from `db/reviews:byShop` / `db/reviews:findAll`.
 * @returns The review document as `ReviewBase`.
 */
export const docToReview = (doc: Doc): ReviewBase => stripInternals(doc) as unknown as ReviewBase;

/**
 * Projects a Convex `featureFlags` row onto the public `FeatureFlagBase` shape: internals stripped,
 * `legacyId` projected onto `id`, timestamps rehydrated.
 *
 * @param doc - Raw flag row from the `db/feature_flags` (or joined shop-flag) reads.
 * @returns The feature flag document as `FeatureFlagBase`.
 */
export const docToFeatureFlag = (doc: Doc): FeatureFlagBase => stripInternals(doc) as unknown as FeatureFlagBase;

/**
 * Projects a Convex OAuth identity embedded on a user (`users.identities[]`) onto `IdentityBase`,
 * rehydrating the optional epoch-ms `expiresAt` into a `Date` alongside the managed timestamps.
 *
 * @param doc - Raw identity payload.
 * @returns The identity document as `IdentityBase`.
 */
export const docToIdentity = (doc: Doc): IdentityBase => {
    const out = stripInternals(doc) as Doc;
    if (typeof out.expiresAt === 'number') {
        out.expiresAt = new Date(out.expiresAt);
    }
    return out as unknown as IdentityBase;
};

/**
 * Projects a Convex `users` row onto `UserBase`: internals stripped, the nullable epoch-ms
 * `emailVerified` rehydrated to `Date | null`, and every embedded identity mapped through
 * {@link docToIdentity}.
 *
 * @param doc - Raw user row from the `db/users` reads.
 * @returns The user document as `UserBase`.
 */
export const docToUser = (doc: Doc): UserBase => {
    const out = stripInternals(doc) as Doc;
    if (typeof out.emailVerified === 'number') {
        out.emailVerified = new Date(out.emailVerified);
    }
    if (Array.isArray(out.identities)) {
        out.identities = out.identities.map((identity) => docToIdentity(identity as Doc));
    }
    return out as unknown as UserBase;
};

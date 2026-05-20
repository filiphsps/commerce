import type { FeatureFlagBase, OnlineShop, ReviewBase } from '../models';

type Doc = Record<string, unknown>;

export const stripInternals = <T extends Doc>(doc: T): Omit<T, '_id' | '__v'> => {
    if (!doc) return doc;

    const { _id: _id_, __v: __v_, ...rest } = doc as { _id?: unknown; __v?: unknown } & T;
    return rest;
};

/**
 * Map a Mongoose lean `shops` doc to the public `OnlineShop` shape.
 * - Drops the internal `_id` and `__v` keys (callers see `id` via the
 *   Mongoose virtual when `toObject({ virtuals: true })` is used; lean
 *   docs expose the Mongo `_id` directly, which we strip here).
 * - Strips `commerceProvider.authentication.token` and
 *   `customers.clientSecret` so the public shape contains no secrets.
 *   Callers that need the unmasked token (trusted server-only paths)
 *   request `sensitiveData: true` on the service method, which routes
 *   around this masking while still removing `_id`/`__v` via
 *   `stripInternals`.
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

export const docToReview = (doc: Doc): ReviewBase => stripInternals(doc) as unknown as ReviewBase;

export const docToFeatureFlag = (doc: Doc): FeatureFlagBase => stripInternals(doc) as unknown as FeatureFlagBase;

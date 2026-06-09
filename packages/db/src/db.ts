import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

/**
 * String `id` every document in this package exposes. For Convex-backed rows this is the PUBLIC id:
 * the migrated Mongo `ObjectId` (`legacyId`) for shops and feature flags, the Convex document id
 * string for the platform-global auth rows. The raw Convex `_id` is never surfaced.
 *
 * @example
 * ```ts
 * import type { DocumentExtras } from '@nordcom/commerce-db';
 * function getId(doc: DocumentExtras): string {
 *     return doc.id;
 * }
 * ```
 */
export type DocumentExtras = {
    id: string;
};

/**
 * Managed timestamp fields every document carries. The Convex rows persist these as epoch-ms
 * numbers (preserving the source Mongo `timestamps: true` values across the migration); the seam
 * re-hydrates them to `Date` on read so the ~183 importers keep their `Date`-typed contract.
 *
 * @example
 * ```ts
 * import type { BaseTimestamps } from '@nordcom/commerce-db';
 * function ageMs(doc: BaseTimestamps): number {
 *     return Date.now() - doc.createdAt.getTime();
 * }
 * ```
 */
export type BaseTimestamps = {
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Baseline shape for every document in this package: the flat `{ id, createdAt, updatedAt }`
 * triple. Previously this intersected the Mongoose `Document` interface; the Convex re-home returns
 * plain rows with no document methods, so the base type is now exactly the managed fields —
 * `Service.create` still strips them from its input via `Omit<DocType, keyof BaseDocument>`.
 *
 * @example
 * ```ts
 * import type { BaseDocument } from '@nordcom/commerce-db';
 * function label(doc: BaseDocument): string {
 *     return `${doc.id} (updated ${doc.updatedAt.toISOString()})`;
 * }
 * ```
 */
export type BaseDocument = DocumentExtras & BaseTimestamps;

let client: ConvexHttpClient | undefined;

/**
 * Lazily constructs (and caches) the server-side Convex client. Lazy on purpose: the old seam
 * connected to Mongo at module load, which forced every importer to carry a database URL at build
 * time; deferring to first use keeps `import '@nordcom/commerce-db'` side-effect free and lets test
 * substrates mock the transport before any call happens.
 *
 * @returns The shared `ConvexHttpClient` for this process.
 * @throws {MissingEnvironmentVariableError} When neither `CONVEX_URL` nor `NEXT_PUBLIC_CONVEX_URL`
 *   is set.
 */
function getConvexClient(): ConvexHttpClient {
    if (!client) {
        const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) {
            throw new MissingEnvironmentVariableError('CONVEX_URL');
        }
        client = new ConvexHttpClient(url);
    }
    return client;
}

/**
 * Reads the shared server-trust secret presented as the `serverSecret` arg on every seam call. The
 * Convex `serverQuery`/`serverMutation` constructors fail closed without a matching secret, so an
 * unset value here is a hard misconfiguration rather than a silent degradation.
 *
 * @returns The `CONVEX_SERVER_SECRET` value.
 * @throws {MissingEnvironmentVariableError} When `CONVEX_SERVER_SECRET` is unset or empty.
 */
function getServerSecret(): string {
    const secret = process.env.CONVEX_SERVER_SECRET;
    if (!secret) {
        throw new MissingEnvironmentVariableError('CONVEX_SERVER_SECRET');
    }
    return secret;
}

/**
 * Calls a deployed Convex `serverQuery` function by path (e.g. `db/shops:byDomain`), injecting the
 * shared `serverSecret` the server-trust constructor requires. This is the seam's only read
 * transport; the identity-less pre-tenant/cross-tenant reads (`Shop.findByDomain` in middleware,
 * `findAll`, the auth adapter lookups) all flow through it.
 *
 * @param name - The Convex function path in `module/path:function` form.
 * @param args - The function's own args (the secret is appended here, never by callers).
 * @returns The function's result.
 * @throws {MissingEnvironmentVariableError} When the Convex URL or server secret is unset.
 */
export async function convexServerQuery<Result>(name: string, args: Record<string, unknown>): Promise<Result> {
    const reference = makeFunctionReference<'query', Record<string, unknown>, Result>(name);
    return getConvexClient().query(reference, { ...args, serverSecret: getServerSecret() });
}

/**
 * Calls a deployed Convex `serverMutation` function by path — the write-side companion of
 * {@link convexServerQuery}. Every seam write performs exactly ONE call through this transport (one
 * Convex transaction), which the single-mutation gate in `lib/single-mutation-gate.ts` enforces.
 *
 * @param name - The Convex function path in `module/path:function` form.
 * @param args - The function's own args (the secret is appended here, never by callers).
 * @returns The function's result.
 * @throws {MissingEnvironmentVariableError} When the Convex URL or server secret is unset.
 */
export async function convexServerMutation<Result>(name: string, args: Record<string, unknown>): Promise<Result> {
    const reference = makeFunctionReference<'mutation', Record<string, unknown>, Result>(name);
    return getConvexClient().mutation(reference, { ...args, serverSecret: getServerSecret() });
}

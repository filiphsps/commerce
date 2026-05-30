import type { ProjectionType, QueryFilter, QueryOptions, UpdateQuery } from 'mongoose';

import type { BaseDocument } from '../db';
import type {
    FeatureFlagBase,
    IdentityBase,
    OnlineShop,
    ReviewBase,
    SessionBase,
    ShopBase,
    UserBase,
} from '../models';
import type { FeatureFlag } from './feature-flag';
import type { Identity } from './identity';
import type { Review } from './review';
import type { Session } from './session';
import type { FindOptions, Shop } from './shop';
import type { User } from './user';

/**
 * SFREAD-02 — hand-written type-level snapshot of the `packages/db` service
 * seam: the 6 exported service singletons (`Identity`, `Session`, `User`,
 * `Shop`, `Review`, `FeatureFlag`) plus the public `OnlineShop` / `ShopBase` /
 * `ReviewBase` shapes they return. This module declares only `type` aliases; it
 * carries no runtime code. It asserts, at compile time, that every public
 * service method still matches the frozen signature below. ~183 importers
 * depend on this surface; before its Mongoose backing is re-homed on Convex
 * (SFREAD-03/05/06) the re-home must be provably behavior-preserving, so any
 * drift in a parameter list or (awaited) return type has to fail typecheck
 * rather than slip through.
 *
 * It is a `.ts` (not `.d.ts`) on purpose: the repo sets `skipLibCheck: true`,
 * which makes tsc skip type-checking every `.d.ts` — so a `.d.ts` snapshot
 * would be inert and never catch drift. As a plain source file it lives in the
 * typecheck graph (`tsconfig.json` includes `./src/**​/*.ts`) and gates drift
 * on every CI run. Service singletons are imported with `import type` and read
 * only inside `typeof`/indexed-access type queries, so the file emits nothing
 * and pulls in no `server-only` runtime. Unused `type` aliases are never
 * flagged by `noUnusedLocals`, so the assertions need no consumer beyond the
 * single exported tuple below.
 *
 * Note on the `{ shop, locale }` calling convention: the spec asks for it to be
 * pinned, but `packages/db` services do NOT take `{ shop, locale }` — that
 * convention belongs to the Shopify client layer (`ShopifyApolloApiClient`),
 * not the persistence seam. What IS frozen here is the actual object-argument
 * calling convention these services use: `Shop.findByCollaborator({
 * collaboratorId })`, `Review.findAll({ tenant })`, `Review.findByShop(id, {
 * count })`, and the base `Service.find({ id | count | filter | projection })`
 * overload split.
 *
 * To verify the gate works: change any frozen signature below (or a service
 * method) and run typecheck — it must error on the corresponding tuple element
 * with `TS2344: Type 'false' does not satisfy the constraint 'true'`.
 */

/**
 * Invariant (bivariance-free) type equality. Resolves to `true` only when `A`
 * and `B` are mutually assignable in both directions, so widened or narrowed
 * drift is caught rather than silently accepted.
 */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/** Compile-time assertion: fails the build when `T` is not exactly `true`. */
type Expect<T extends true> = T;

/**
 * The frozen contract, expressed as a tuple of compile-time assertions. Every
 * element must resolve to `true`; any drift flips one element to `false`, which
 * violates `Expect`'s `extends true` constraint and fails typecheck with
 * `TS2344: Type 'false' does not satisfy the constraint 'true'`. The tuple is
 * exported so each assertion counts as "used" — `noUnusedLocals` (TS6196) would
 * otherwise reject standalone assertion aliases.
 */
export type ServiceSeamContractSnapshot = [
    // --- Base `Service` contract, applied to the three thin singletons
    // (`Identity`, `Session`, `User`) that are plain `Service<DocType, Model>`
    // instances with no overrides. `create` strips `BaseDocument`-managed
    // fields from its input; `find`'s single-doc overload (`{ id }` or
    // `count: 1`) returns `Promise<DocType>` and throws `NotFoundError` on an
    // empty match (pinned at runtime), while the visible array overload (the
    // last public signature, which `ReturnType` resolves to — the union-typed
    // implementation signature is not part of the method's public type) returns
    // `Promise<DocType[]>`; `findById`/`findOneAndUpdate` resolve to
    // `DocType | null`.
    Expect<Equal<(typeof Identity)['create'], (input: Omit<IdentityBase, keyof BaseDocument>) => Promise<IdentityBase>>>,
    Expect<(typeof Identity)['find'] extends (args: { id: string }) => Promise<IdentityBase> ? true : false>,
    Expect<Equal<Awaited<ReturnType<(typeof Identity)['find']>>, IdentityBase[]>>,
    Expect<
        Equal<
            (typeof Identity)['findById'],
            (
                id: string,
                projection?: ProjectionType<IdentityBase> | null,
                options?: QueryOptions<IdentityBase> | null,
            ) => Promise<IdentityBase | null>
        >
    >,
    Expect<
        Equal<
            (typeof Identity)['findOneAndUpdate'],
            (
                filter: QueryFilter<IdentityBase>,
                update?: UpdateQuery<IdentityBase>,
                options?: QueryOptions<IdentityBase>,
            ) => Promise<IdentityBase | null>
        >
    >,

    Expect<Equal<(typeof Session)['create'], (input: Omit<SessionBase, keyof BaseDocument>) => Promise<SessionBase>>>,
    Expect<(typeof Session)['find'] extends (args: { id: string }) => Promise<SessionBase> ? true : false>,
    Expect<Equal<Awaited<ReturnType<(typeof Session)['find']>>, SessionBase[]>>,
    Expect<
        Equal<
            (typeof Session)['findById'],
            (
                id: string,
                projection?: ProjectionType<SessionBase> | null,
                options?: QueryOptions<SessionBase> | null,
            ) => Promise<SessionBase | null>
        >
    >,
    Expect<
        Equal<
            (typeof Session)['findOneAndUpdate'],
            (
                filter: QueryFilter<SessionBase>,
                update?: UpdateQuery<SessionBase>,
                options?: QueryOptions<SessionBase>,
            ) => Promise<SessionBase | null>
        >
    >,

    Expect<Equal<(typeof User)['create'], (input: Omit<UserBase, keyof BaseDocument>) => Promise<UserBase>>>,
    Expect<(typeof User)['find'] extends (args: { id: string }) => Promise<UserBase> ? true : false>,
    Expect<Equal<Awaited<ReturnType<(typeof User)['find']>>, UserBase[]>>,
    Expect<
        Equal<
            (typeof User)['findById'],
            (
                id: string,
                projection?: ProjectionType<UserBase> | null,
                options?: QueryOptions<UserBase> | null,
            ) => Promise<UserBase | null>
        >
    >,
    Expect<
        Equal<
            (typeof User)['findOneAndUpdate'],
            (
                filter: QueryFilter<UserBase>,
                update?: UpdateQuery<UserBase>,
                options?: QueryOptions<UserBase>,
            ) => Promise<UserBase | null>
        >
    >,

    // --- `ShopService`: extends `Service<ShopBase, …>` and overrides
    // `findById` to always resolve `OnlineShop` (or throw) rather than return
    // `null`. Read methods return the masked `OnlineShop` shape by default;
    // `findByDomain` returns the raw `ShopBase` when `convert: false`. The
    // inherited `create`/`find` keep the base `ShopBase` contract.
    Expect<Equal<(typeof Shop)['create'], (input: Omit<ShopBase, keyof BaseDocument>) => Promise<ShopBase>>>,
    Expect<Equal<Awaited<ReturnType<(typeof Shop)['find']>>, ShopBase[]>>,
    // `findOneAndUpdate` is inherited unchanged from the base `Service`. Pin it
    // explicitly here too: `ShopService` is re-homed independently in
    // SFREAD-03/05/06, so a Shop-only override would otherwise slip past the
    // base-contract assertions (which run against Identity/Session/User).
    Expect<
        Equal<
            (typeof Shop)['findOneAndUpdate'],
            (
                filter: QueryFilter<ShopBase>,
                update?: UpdateQuery<ShopBase>,
                options?: QueryOptions<ShopBase>,
            ) => Promise<ShopBase | null>
        >
    >,
    Expect<
        (typeof Shop)['findByDomain'] extends (
            domain: string,
            options?: FindOptions,
        ) => Promise<OnlineShop | ShopBase>
            ? true
            : false
    >,
    Expect<Equal<ReturnType<(typeof Shop)['findByDomain']>, Promise<OnlineShop | ShopBase>>>,
    Expect<
        Equal<(typeof Shop)['findById'], (id: string, ..._rest: never[]) => Promise<OnlineShop> & Promise<ShopBase | null>>
    >,
    Expect<Equal<(typeof Shop)['findByCollaborator'], (args: { collaboratorId: string }) => Promise<OnlineShop[]>>>,
    Expect<Equal<(typeof Shop)['findAll'], () => Promise<OnlineShop[]>>>,

    // --- `ReviewService`: standalone (no `Service` base). `findByShop` caps via
    // an optional `{ count }`; `findAll` filters via an optional `{ tenant }`.
    Expect<Equal<(typeof Review)['findByShop'], (shopId: string, options?: { count?: number }) => Promise<ReviewBase[]>>>,
    Expect<Equal<(typeof Review)['findAll'], (options?: { tenant?: string }) => Promise<ReviewBase[]>>>,

    // --- `FeatureFlagService`: standalone. `findByKey` resolves `null` on a
    // miss (no throw); `findAll` returns every flag.
    Expect<Equal<(typeof FeatureFlag)['findByKey'], (key: string) => Promise<FeatureFlagBase | null>>>,
    Expect<Equal<(typeof FeatureFlag)['findAll'], () => Promise<FeatureFlagBase[]>>>,

    // --- Public return shapes. Freeze the load-bearing members of the three
    // types these services hand to ~183 importers so a re-home cannot silently
    // reshape them: every record carries a string `id`, shop domains stay
    // `string`, and a review still embeds the full `ShopBase`.
    Expect<Equal<ShopBase['domain'], string>>,
    Expect<Equal<ShopBase['id'], string>>,
    Expect<Equal<OnlineShop['id'], string>>,
    Expect<Equal<ReviewBase['id'], string>>,
    Expect<Equal<ReviewBase['shop'], ShopBase>>,
];

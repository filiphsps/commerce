import type { Payload } from 'payload';
import type {
    Article,
    BusinessDatum,
    CollectionMetadatum,
    Footer,
    Header,
    Page,
    ProductMetadatum,
} from '../types/payload-types';
import type { GetArticleArgs, getArticle } from './get-article';
import type { GetArticlesArgs, getArticles } from './get-articles';
import type { GetBusinessDataArgs, getBusinessData } from './get-business-data';
import type { GetCollectionMetadataArgs, getCollectionMetadata } from './get-collection-metadata';
import type { GetFooterArgs, getFooter } from './get-footer';
import type { GetHeaderArgs, getHeader } from './get-header';
import type { GetPageArgs, getPage } from './get-page';
import type { GetPagesArgs, getPages } from './get-pages';
import type { GetProductMetadataArgs, getProductMetadata } from './get-product-metadata';
import type { LinkValue, resolveLink } from './resolve-link';
import type { resolveTenantId } from './resolve-tenant-id';

/**
 * SFREAD-01 — hand-written type-level snapshot of the 11 storefront CMS read
 * getters. This module declares only `type` aliases; it carries no runtime
 * code. It asserts, at compile time, that each getter's argument and (awaited)
 * return type still match the frozen contract below. If any getter's signature
 * or return type drifts — a getter starts throwing instead of returning
 * `null`, a doc type changes shape, an argument is added/removed — one of the
 * `Expect<Equal<…>>` aliases stops satisfying its `extends true` constraint and
 * `pnpm typecheck` fails.
 *
 * Authored by hand, NOT tsc-emitted. It is a `.ts` (not `.d.ts`) on purpose:
 * the repo sets `skipLibCheck: true`, which makes tsc skip type-checking every
 * `.d.ts` — so a `.d.ts` snapshot would be inert and never catch drift. As a
 * plain source file it lives in the typecheck graph (`tsconfig.json` includes
 * `./src/**​/*.ts`) and gates drift on every CI run. Unused `type` aliases are
 * never flagged by `noUnusedLocals`, so the assertions need no consumer.
 *
 * To verify the gate works: change any frozen type below (or a getter's
 * signature) and run `pnpm --filter @nordcom/commerce-cms typecheck` — it must
 * error on the corresponding tuple element.
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
 * violates `Expect`'s `extends true` constraint and fails `pnpm typecheck` with
 * `TS2344: Type 'false' does not satisfy the constraint 'true'`. The tuple is
 * exported so each assertion counts as "used" — `noUnusedLocals` (TS6196) would
 * otherwise reject standalone assertion aliases.
 */
export type CmsReadGetterContractSnapshot = [
    // Single-doc getters: `(args) => Promise<Doc | null>`.
    Expect<Equal<Parameters<typeof getPage>[0], GetPageArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getPage>>, Page | null>>,
    Expect<Equal<Parameters<typeof getArticle>[0], GetArticleArgs & { __payload?: Payload }>>,
    Expect<Equal<Awaited<ReturnType<typeof getArticle>>, Article | null>>,
    Expect<Equal<Parameters<typeof getHeader>[0], GetHeaderArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getHeader>>, Header | null>>,
    Expect<Equal<Parameters<typeof getFooter>[0], GetFooterArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getFooter>>, Footer | null>>,
    Expect<Equal<Parameters<typeof getBusinessData>[0], GetBusinessDataArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getBusinessData>>, BusinessDatum | null>>,
    Expect<Equal<Parameters<typeof getProductMetadata>[0], GetProductMetadataArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getProductMetadata>>, ProductMetadatum | null>>,
    Expect<Equal<Parameters<typeof getCollectionMetadata>[0], GetCollectionMetadataArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getCollectionMetadata>>, CollectionMetadatum | null>>,
    // List getters: `(args) => Promise<PaginatedDocs<Doc>>`. The pagination
    // envelope is frozen via its `docs` member — the storefront consumes
    // `.docs[i]` shapes and the pagination meta together.
    Expect<Equal<Parameters<typeof getPages>[0], GetPagesArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getPages>>['docs'], Page[]>>,
    Expect<Equal<Parameters<typeof getArticles>[0], GetArticlesArgs>>,
    Expect<Equal<Awaited<ReturnType<typeof getArticles>>['docs'], Article[]>>,
    // Pure resolvers.
    Expect<Equal<Parameters<typeof resolveLink>[0], LinkValue>>,
    Expect<Equal<Parameters<typeof resolveLink>[1], { locale: { code: string } }>>,
    Expect<Equal<ReturnType<typeof resolveLink>, string>>,
    Expect<Equal<Parameters<typeof resolveTenantId>, [Payload, string]>>,
    Expect<Equal<ReturnType<typeof resolveTenantId>, Promise<string | null>>>,
];

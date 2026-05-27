declare const brand: unique symbol;

/**
 * Nominal branding wrapper that makes otherwise structurally equivalent types distinguishable at
 * the type level; used to prevent `str` and `num` param tokens from being swapped accidentally.
 *
 * @example
 * ```ts
 * // EntityDecl params use Brand to distinguish string vs number slots.
 * const entities = { product: { params: { id: str, rank: num } } };
 * ```
 */
export type Brand<T> = { readonly [brand]: T };

/**
 * Union of the two supported cache-key param kinds (`str` and `num`); the type-level token
 * callers assign to each field in a `ParamMap` to declare its runtime shape.
 *
 * @example
 * ```ts
 * const paramKind: ParamType = str; // or `num`
 * ```
 */
export type ParamType = Brand<string> | Brand<number>;

/**
 * Unwraps a `ParamType` brand token to the concrete `string` or `number` type it represents;
 * used by `ParamValues` to derive the runtime argument type for each declared entity param.
 *
 * @example
 * ```ts
 * type IdType = ParamTypeShape<typeof str>; // string
 * type RankType = ParamTypeShape<typeof num>; // number
 * ```
 */
export type ParamTypeShape<P extends ParamType> = P extends Brand<infer S> ? S : never;

/**
 * Type constraint for the `params` field of an `EntityDecl`; maps param names to their `ParamType`
 * brand tokens, which `ParamValues` later unfolds into concrete `string` or `number` values.
 *
 * @example
 * ```ts
 * const productParams: ParamMap = { id: str, version: num };
 * ```
 */
export type ParamMap = Record<string, ParamType>;

/**
 * Converts a `ParamMap` into the corresponding runtime argument shape where each branded token
 * is replaced by its concrete `string` or `number` type; used to type the entity-specific
 * arguments accepted by `KeyFactory` methods and `InvalidateNamespace` entity methods.
 *
 * @example
 * ```ts
 * type ProductArgs = ParamValues<{ id: typeof str; rank: typeof num }>;
 * // { id: string; rank: number }
 * ```
 */
export type ParamValues<P extends ParamMap | undefined> = P extends ParamMap
    ? { [K in keyof P]: ParamTypeShape<P[K]> }
    : {};

/**
 * Declares a single entity within a cache schema, specifying the optional params it accepts for
 * leaf-level key building and the parent entity names whose cache entries should also be
 * invalidated when this entity is purged.
 *
 * @example
 * ```ts
 * const entities = {
 *     product: { params: { id: str } },
 *     collection: { params: { handle: str }, parents: ['product'] },
 * } satisfies EntitiesMap;
 * ```
 */
export interface EntityDecl<
    P extends ParamMap | undefined = undefined,
    R extends readonly string[] = readonly never[],
> {
    params?: P;
    parents?: R;
}

/**
 * Brand token that marks a `ParamMap` field as accepting a `string` value at runtime; assign to
 * entity param fields that identify records by text keys such as handles, slugs, or GIDs.
 *
 * @example
 * ```ts
 * const entities = { product: { params: { id: str, handle: str } } };
 * ```
 */
export const str = {} as Brand<string>;

/**
 * Brand token that marks a `ParamMap` field as accepting a `number` value at runtime; assign to
 * entity param fields that identify records by numeric indices, version counters, or integer IDs.
 *
 * @example
 * ```ts
 * const entities = { variant: { params: { rank: num } } };
 * ```
 */
export const num = {} as Brand<number>;

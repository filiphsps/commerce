export * from './db';
export * from './lib/feature-flag';
export * from './lib/theme';
export * from './models';
export * from './services';

/**
 * Converts every key of `T` to optional and nullable. Use to type partial update inputs where any
 * field may be omitted or explicitly cleared to `null`.
 *
 * @example
 * ```ts
 * import type { Optional, ShopBase } from '@nordcom/commerce-db';
 * async function patchShop(id: string, patch: Optional<ShopBase>) { /* ... *\/ }
 * ```
 */
export type Optional<T extends { [key: string]: unknown }> = { [K in keyof T]?: Nullable<T[K]> };
/**
 * Adds `null` to a type to represent an explicitly absent value, distinct from `undefined` which
 * TypeScript uses for optional properties. Use when a field can be cleared to a known empty state.
 *
 * @example
 * ```ts
 * import type { Nullable } from '@nordcom/commerce-db';
 * const avatar: Nullable<string> = user.avatar ?? null;
 * ```
 */
export type Nullable<T> = T | null;
/**
 * Marks an entity as having a URL-safe `handle` slug. Types that satisfy this contract can be
 * passed to slug-based lookup and routing utilities.
 *
 * @example
 * ```ts
 * import type { Identifiable } from '@nordcom/commerce-db';
 * function slugPath(entity: Identifiable): string {
 *     return `/${entity.handle}/`;
 * }
 * ```
 */
export type Identifiable = { handle: string };

/**
 * Union of pagination shapes accepted by service query methods. Callers may pass either a plain
 * `limit` cap or a forward/backward cursor pair (`first`/`last`) — both are valid at the call site.
 *
 * @example
 * ```ts
 * import type { LimitFilters } from '@nordcom/commerce-db';
 * async function listItems(filters: LimitFilters) { /* ... *\/ }
 * ```
 */
export type LimitFilters = { limit?: Nullable<number> } | { first?: Nullable<number>; last?: Nullable<number> };

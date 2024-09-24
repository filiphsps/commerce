export * from './db';
export * from './models';
export * from './services';
export type * from './session';

export type Optional<T extends { [key: string]: unknown }> = { [K in keyof T]?: Nullable<T[K]> };
export type Nullable<T> = T | null;
export type Identifiable = { handle: string };

export type LimitFilters = { limit?: Nullable<number> } | { first?: Nullable<number>; last?: Nullable<number> };

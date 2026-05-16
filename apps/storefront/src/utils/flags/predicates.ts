import 'server-only';

import type { FlagEntities } from './entities';

export type Predicate<P = unknown> = (entities: FlagEntities, params: P) => boolean;

export interface PredicateMetadata {
    /**
     * True when this predicate reads from `entities.user` or `entities.session`.
     * `evaluateShopFlag` (cache-safe path) skips rules whose predicate requires user
     * data because cached scopes have no request context to identify the user.
     */
    requiresUser?: boolean;
}

interface PredicateEntry {
    fn: Predicate;
    metadata: PredicateMetadata;
}

const predicates = new Map<string, PredicateEntry>();
const warnedUnknown = new Set<string>();

export function registerPredicate<P>(name: string, fn: Predicate<P>, metadata: PredicateMetadata = {}): void {
    if (predicates.has(name)) {
        throw new Error(`Predicate "${name}" already registered`);
    }
    predicates.set(name, { fn: fn as Predicate, metadata });
}

export function getPredicateMetadata(name: string): PredicateMetadata | undefined {
    return predicates.get(name)?.metadata;
}

export function evaluatePredicate(name: string, params: unknown, entities: FlagEntities): boolean {
    const entry = predicates.get(name);
    if (!entry) {
        if (!warnedUnknown.has(name)) {
            warnedUnknown.add(name);
            console.warn(`[flags] unknown predicate "${name}" — treating as no-match`);
        }
        return false;
    }
    try {
        return entry.fn(entities, params);
    } catch (error) {
        console.error(`[flags] predicate "${name}" threw — treating as no-match`, error);
        return false;
    }
}

/**
 * Test-only: clear the registry between tests.
 * Not exported from the public barrel.
 */
export function __resetPredicatesForTest(): void {
    predicates.clear();
    warnedUnknown.clear();
}

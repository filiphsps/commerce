import 'server-only';

import { DuplicatePredicateRegistrationError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';

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

/**
 * Adds a named predicate function to the global registry for use in flag targeting rules.
 *
 * @param name - Unique rule name as stored in MongoDB flag targeting entries.
 * @param fn - Predicate that receives `FlagEntities` and rule-specific `params`; returns `true` to match the rule.
 * @param metadata - Optional hints for the evaluation layer (e.g., `requiresUser: true` to skip in cached scopes).
 * @throws {DuplicatePredicateRegistrationError} When a predicate with the same `name` has already been registered.
 */
export function registerPredicate<P>(name: string, fn: Predicate<P>, metadata: PredicateMetadata = {}): void {
    if (predicates.has(name)) {
        throw new DuplicatePredicateRegistrationError(name);
    }
    predicates.set(name, { fn: fn as Predicate, metadata });
}

/**
 * Retrieves the metadata associated with a registered predicate.
 *
 * @param name - The predicate's registered name.
 * @returns The `PredicateMetadata` for the predicate, or `undefined` when no predicate is registered under that name.
 */
export function getPredicateMetadata(name: string): PredicateMetadata | undefined {
    return predicates.get(name)?.metadata;
}

/**
 * Looks up a named predicate in the registry and calls it with the supplied params and entities.
 *
 * @param name - The rule name as stored in MongoDB targeting entries.
 * @param params - Rule-specific configuration passed through to the predicate function.
 * @param entities - The request context (shop, session, user, visitorId) for the evaluation.
 * @returns `true` when the predicate matches, `false` when the predicate is unregistered or throws.
 */
export function evaluatePredicate(name: string, params: unknown, entities: FlagEntities): boolean {
    const entry = predicates.get(name);
    if (!entry) {
        if (!warnedUnknown.has(name)) {
            warnedUnknown.add(name);
            trace.getActiveSpan()?.addEvent('flags.unknown_predicate', {
                'predicate.name': name,
            });
        }
        return false;
    }
    try {
        return entry.fn(entities, params);
    } catch (error) {
        trace.getActiveSpan()?.addEvent('flags.predicate_threw', {
            'error.message': (error as Error)?.message ?? String(error),
            'predicate.name': name,
        });
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

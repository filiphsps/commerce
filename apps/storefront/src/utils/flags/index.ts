import 'server-only';

import { registerBuiltinPredicates } from './register-builtin-predicates';

// Register built-in predicates eagerly when the flags module is first imported.
// Idempotent guard: re-imports under HMR / test reloads no-op gracefully via the
// registry's "already registered" throw, which we catch here only on the very
// first import to avoid the duplicate-register error during dev hot reload.
try {
    registerBuiltinPredicates();
} catch (error) {
    if (!(error instanceof Error) || !/already registered/.test(error.message)) {
        throw error;
    }
}

export { nordcomFlagAdapter } from './adapter';
export { type FlagEntities, type FlagUser, mapSessionToUser } from './entities';
export { type EvaluateShopFlagOptions, evaluateShopFlag } from './evaluate';
export { type FlagOverrides, getFlagOverrides } from './overrides';
export {
    evaluatePredicate,
    getPredicateMetadata,
    type Predicate,
    type PredicateMetadata,
    registerPredicate,
} from './predicates';
export { reportFlagValue } from './report';

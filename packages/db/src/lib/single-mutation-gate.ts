/**
 * Static gate for the seam's write atomicity invariant: every `packages/db` write performs exactly
 * ONE Convex mutation call (`convexServerMutation(...)`) — one serializable Convex transaction.
 * Splitting a logical write across two mutations would reintroduce the read-modify-write races the
 * mutation layer exists to prevent (e.g. the `(provider, identity)` uniqueness upsert), so a
 * two-call write must fail review mechanically rather than by convention.
 */

/**
 * One detected violation: a single function body issuing more than one transport mutation call.
 */
export interface MultiMutationViolation {
    /** Number of `convexServerMutation(` call sites inside the function body. */
    count: number;
    /** The opening slice of the offending function body, for actionable test output. */
    snippet: string;
}

/**
 * Scans a TypeScript source for function bodies that call `convexServerMutation(` more than once.
 *
 * The unit of analysis is the span between successive `async` keywords: every seam write is an
 * `async` function/method/arrow, so a span containing two transport mutation calls means one write
 * body issues two mutations — a helper extracted into its own `async` function starts a new span
 * and is judged on its own. This is deliberately a convention-anchored textual gate (the seam's
 * sources are all authored in-repo), not a full parser.
 *
 * @param source - The TypeScript source text to scan.
 * @returns All violations found; empty when every write issues at most one mutation.
 */
export function findMultiMutationWrites(source: string): MultiMutationViolation[] {
    const violations: MultiMutationViolation[] = [];
    for (const span of source.split(/\basync\b/)) {
        const count = span.split('convexServerMutation(').length - 1;
        if (count > 1) {
            violations.push({ count, snippet: span.trim().slice(0, 160) });
        }
    }
    return violations;
}

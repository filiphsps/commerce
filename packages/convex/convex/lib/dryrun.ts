import type { Validator } from 'convex/values';
import { validate } from 'convex-helpers/validators';

/**
 * The pure, runtime-agnostic core of the expand → backfill → contract deploy gate: given a PROPOSED
 * tightened validator and the live rows it must accept, decide whether promotion is safe. Kept free of
 * any Node or Convex-isolate imports (only `convex-helpers`/`convex` value utilities and `console`) so
 * the SAME logic typechecks under the Convex package's isolate config, runs under `convex-test`, and is
 * importable by the `scripts/deploy-dry-run.ts` Node entrypoint without dragging Node globals into the
 * isolate program.
 */

/**
 * A pre-promotion check that the live rows of one table still satisfy a PROPOSED tightened validator —
 * the contract half of an expand → backfill → contract schema evolution. `validator` is the tightened
 * shape (e.g. a once-optional field promoted to required, or a narrowed union); `rows` are the live
 * documents to validate against it BEFORE the schema is pushed.
 *
 * @property table - The table the tightening targets (reporting only).
 * @property validator - The tightened validator the rows must satisfy post-promotion.
 * @property rows - The live documents to validate before promoting the tightening.
 */
export type TighteningCheck = {
    table: string;
    validator: Validator<unknown, 'required' | 'optional', string>;
    rows: ReadonlyArray<unknown>;
};

/**
 * A live row that would be REJECTED by a proposed tightened validator, paired with why.
 *
 * @property row - The offending document.
 * @property reason - A human-readable explanation (the validator error, when available).
 */
export type RejectedRow = {
    row: unknown;
    reason: string;
};

/**
 * Per-table summary of which live rows a tightening would reject.
 *
 * @property table - The table the rejected rows belong to.
 * @property rejected - The offending rows (empty means the tightening is safe for this table).
 */
export type DryRunFinding = {
    table: string;
    rejected: RejectedRow[];
};

/**
 * Validates each row against a proposed tightened validator and returns those that would be REJECTED.
 *
 * This mirrors the row validation Convex itself runs server-side when a schema is pushed — a push that
 * would invalidate existing documents is refused. Running it here, BEFORE promotion, turns that
 * server-side rejection into an explicit, inspectable pre-deploy gate. Unknown fields are tolerated
 * (`allowUnknownFields`) because expand/contract only ADDS or TIGHTENS the fields under evaluation; a
 * row carrying an extra field from a not-yet-removed column is not the tightening's concern.
 *
 * @param validator - The tightened validator the rows must satisfy.
 * @param rows - The live documents to check.
 * @returns The rows that fail the validator, each with a reason; empty when all rows pass.
 */
export function findRejectedRows(validator: TighteningCheck['validator'], rows: ReadonlyArray<unknown>): RejectedRow[] {
    const rejected: RejectedRow[] = [];
    for (const row of rows) {
        try {
            if (!validate(validator, row, { throw: true, allowUnknownFields: true })) {
                rejected.push({ row, reason: 'row does not satisfy the tightened validator' });
            }
        } catch (error) {
            rejected.push({ row, reason: error instanceof Error ? error.message : String(error) });
        }
    }
    return rejected;
}

/**
 * Evaluates every tightening check and reports whether the schema change is safe to promote.
 *
 * @param checks - The per-table tightening checks to evaluate.
 * @returns `findings` (only tables with at least one rejected row) and `safe` (`true` when no live row
 *   would be rejected by any tightening).
 */
export function evaluateTightening(checks: ReadonlyArray<TighteningCheck>): {
    findings: DryRunFinding[];
    safe: boolean;
} {
    const findings = checks
        .map((check) => ({ table: check.table, rejected: findRejectedRows(check.validator, check.rows) }))
        .filter((finding) => finding.rejected.length > 0);
    return { findings, safe: findings.length === 0 };
}

/**
 * The deploy dry-run decision: refuse to promote if any tightening check would reject a live row,
 * otherwise delegate to the supplied config-validation step (`convex deploy --dry-run`). The live-row
 * check runs FIRST and short-circuits, so a tightening that would invalidate live data fails the gate
 * (non-zero) BEFORE the promotion step ever runs.
 *
 * `configDryRun` is injected rather than imported so this orchestration stays Node-free and fully
 * unit-testable: the Node entrypoint passes the real CLI-spawning step, tests pass a stub.
 *
 * @param checks - The per-table tightening checks to enforce before promotion.
 * @param configDryRun - The config-validation step, invoked only when the live-row checks pass.
 * @returns A process exit code: `1` when a tightening would reject live rows; otherwise the config
 *   dry-run's exit code.
 */
export function runDryRun(checks: ReadonlyArray<TighteningCheck>, configDryRun: () => number): number {
    const { findings, safe } = evaluateTightening(checks);
    if (!safe) {
        for (const finding of findings) {
            console.error(
                `[deploy-dry-run] ${finding.table}: ${finding.rejected.length} live row(s) violate the tightened validator; refusing to promote.`,
            );
        }
        return 1;
    }
    return configDryRun();
}

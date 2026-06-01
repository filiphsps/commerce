import { v } from 'convex/values';
import { describe, expect, it } from 'vitest';

import { evaluateTightening, findRejectedRows, runDryRun } from './dryrun';

/**
 * A tightened validator standing in for a contract step: `region` was added optional, backfilled, and
 * is now promoted to REQUIRED. A live row missing `region` would be rejected by a deploy that pushes
 * this shape.
 */
const tightened = v.object({ id: v.string(), region: v.string() });

describe('deploy dry-run tightening validation', () => {
    it('flags exactly the live rows that violate a tightening change', () => {
        const rejected = findRejectedRows(tightened, [
            { id: 'a', region: 'us' },
            { id: 'b' },
            { id: 'c', region: 'eu' },
        ]);
        expect(rejected).toHaveLength(1);
        expect(rejected[0]?.row).toEqual({ id: 'b' });
    });

    it('reports a tightening with any rejected row as unsafe', () => {
        const { safe, findings } = evaluateTightening([
            { table: 'shops', validator: tightened, rows: [{ id: 'a' }, { id: 'b', region: 'eu' }] },
        ]);
        expect(safe).toBe(false);
        expect(findings).toHaveLength(1);
        expect(findings[0]?.table).toBe('shops');
        expect(findings[0]?.rejected).toHaveLength(1);
    });

    it('fails the gate non-zero BEFORE promotion when a tightening would reject live rows', () => {
        let promoted = false;
        const code = runDryRun(
            [{ table: 'shops', validator: tightened, rows: [{ id: 'a' }, { id: 'b', region: 'eu' }] }],
            () => {
                promoted = true;
                return 0;
            },
        );
        expect(code).toBe(1);
        // The config dry-run (the promotion step) must never run once a live row is rejected.
        expect(promoted).toBe(false);
    });

    it('delegates to the config dry-run when every live row satisfies the tightened validator', () => {
        let promoted = false;
        const code = runDryRun(
            [
                {
                    table: 'shops',
                    validator: tightened,
                    rows: [
                        { id: 'a', region: 'us' },
                        { id: 'b', region: 'eu' },
                    ],
                },
            ],
            () => {
                promoted = true;
                return 0;
            },
        );
        expect(code).toBe(0);
        expect(promoted).toBe(true);
    });
});

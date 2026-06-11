import { describe, expect, it } from 'vitest';

import {
    buildOplogExportArgs,
    classifyOplogWrites,
    normalizeOplogDoc,
    type OplogEntry,
    parseOplogJsonl,
    renderOplogReport,
    RETIRED_SERVICE_COLLECTIONS,
} from './oplog-quiet';

const entry = (ns: string, op = 'i', wallMs: number | null = 1_700_000_000_000): OplogEntry => ({ ns, op, wallMs });

describe('oplog-quiet (CUTOVER-03 stop-Mongo-writes verification)', () => {
    describe('buildOplogExportArgs', () => {
        it('targets oplog.rs with a CRUD-only window query', () => {
            const args = buildOplogExportArgs('mongodb://host/local', '/tmp/oplog.jsonl', 1_700_000_000_000);
            expect(args).toContain('--uri=mongodb://host/local');
            expect(args).toContain('--collection=oplog.rs');
            expect(args).toContain('--out=/tmp/oplog.jsonl');
            const queryArg = args.find((arg) => arg.startsWith('--query='));
            expect(queryArg).toBeDefined();
            const query = JSON.parse((queryArg as string).slice('--query='.length));
            expect(query.op).toEqual({ $in: ['i', 'u', 'd'] });
            expect(query.wall.$gte.$date).toBe(new Date(1_700_000_000_000).toISOString());
        });
    });

    describe('normalizeOplogDoc', () => {
        it('parses both extended-JSON wall encodings', () => {
            expect(normalizeOplogDoc({ ns: 'db.shops', op: 'u', wall: { $date: '2026-06-11T00:00:00.000Z' } })).toEqual(
                {
                    ns: 'db.shops',
                    op: 'u',
                    wallMs: Date.parse('2026-06-11T00:00:00.000Z'),
                },
            );
            expect(
                normalizeOplogDoc({ ns: 'db.shops', op: 'i', wall: { $date: { $numberLong: '1700000000000' } } }),
            ).toEqual({
                ns: 'db.shops',
                op: 'i',
                wallMs: 1_700_000_000_000,
            });
        });

        it('tolerates a missing wall and rejects malformed rows', () => {
            expect(normalizeOplogDoc({ ns: 'db.shops', op: 'd' })).toEqual({ ns: 'db.shops', op: 'd', wallMs: null });
            expect(normalizeOplogDoc({ op: 'i' })).toBeNull();
            expect(normalizeOplogDoc('not-a-doc')).toBeNull();
            expect(normalizeOplogDoc(null)).toBeNull();
        });
    });

    describe('classifyOplogWrites', () => {
        it('flags every retired services collection in any database', () => {
            for (const collection of RETIRED_SERVICE_COLLECTIONS) {
                const { violations } = classifyOplogWrites([entry(`production.${collection}`)]);
                expect(violations, collection).toHaveLength(1);
            }
            const { violations } = classifyOplogWrites([entry('someOtherDb.sessions')]);
            expect(violations).toHaveLength(1);
        });

        it('reports Payload CMS and outbox writes as observed, not violations', () => {
            const { violations, observed } = classifyOplogWrites([
                entry('production.pages', 'u'),
                entry('production._pages_versions', 'i'),
                entry('production.payload-users', 'u'),
                entry('production._convex_outbox', 'i'),
            ]);
            expect(violations).toEqual([]);
            expect(observed.map((row) => row.ns)).toEqual([
                'production._convex_outbox',
                'production._pages_versions',
                'production.pages',
                'production.payload-users',
            ]);
        });

        it('skips replication and system namespaces in both modes', () => {
            const system = [
                entry('local.oplog.rs'),
                entry('admin.system.version'),
                entry('config.transactions'),
                entry('production.system.profile'),
            ];
            expect(classifyOplogWrites(system)).toEqual({ violations: [], observed: [] });
            expect(classifyOplogWrites(system, { quietAll: true })).toEqual({ violations: [], observed: [] });
        });

        it('quietAll (TEARDOWN posture) flags any non-system write', () => {
            const { violations, observed } = classifyOplogWrites([entry('production.pages', 'u')], { quietAll: true });
            expect(violations).toHaveLength(1);
            expect(observed).toEqual([]);
        });

        it('aggregates per namespace: distinct ops, count, newest wall time', () => {
            const { violations } = classifyOplogWrites([
                entry('production.shops', 'i', 1_000),
                entry('production.shops', 'u', 3_000),
                entry('production.shops', 'u', 2_000),
                entry('production.shops', 'd', null),
            ]);
            expect(violations).toEqual([{ ns: 'production.shops', ops: ['d', 'i', 'u'], count: 4, lastWallMs: 3_000 }]);
        });
    });

    describe('parseOplogJsonl', () => {
        it('parses lines, skips blanks, and drops malformed rows', () => {
            const jsonl = `${JSON.stringify({ ns: 'db.shops', op: 'i', wall: { $date: { $numberLong: '5' } } })}\n\n${JSON.stringify({ op: 'i' })}\n`;
            expect(parseOplogJsonl(jsonl)).toEqual([{ ns: 'db.shops', op: 'i', wallMs: 5 }]);
        });
    });

    describe('renderOplogReport', () => {
        it('prints QUIET on a clean window and VIOLATION rows otherwise', () => {
            const quiet = renderOplogReport(classifyOplogWrites([entry('production.pages', 'u')]), 15);
            expect(quiet).toContain('violations=0 observed=1');
            expect(quiet).toContain('QUIET');
            const dirty = renderOplogReport(classifyOplogWrites([entry('production.shops', 'u')]), 15);
            expect(dirty).toContain('VIOLATION production.shops ops=u count=1');
            expect(dirty).not.toContain('QUIET');
        });
    });
});

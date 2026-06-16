import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { findForbiddenMongoDependencies, findMongoModuleReferences } from './mongo-free-runtime';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..');
const packageRoot = join(srcDir, '..');

/**
 * Every non-test TypeScript source in the package, relative to `src/`. Test files are excluded for
 * the same reason `single-mutation-gate.test.ts` excludes them: they hold the negative-case
 * fixtures (literal violation shapes) and never ship in the package's runtime surface.
 *
 * @returns The relative source paths the sweep verifies.
 */
const listSources = (): string[] =>
    readdirSync(srcDir, { recursive: true })
        .map(String)
        .filter((file) => file.endsWith('.ts') && !file.includes('.test.'));

// The TEARDOWN-04 invariant, half one: the package's SOURCES carry zero Mongo module references —
// runtime AND type-level, now that the frozen query-type vocabulary lives in `models/query-types`.
// (Half two — every write is a single Convex mutation — is `single-mutation-gate.test.ts`; the
// behavioral Convex-only proof is `services/identity-session-user.test.ts` here.)
describe('mongo-free runtime gate', () => {
    it('no source in the package references a Mongo driver module', () => {
        const sources = listSources();
        for (const file of sources) {
            const source = readFileSync(join(srcDir, file), 'utf8');
            expect(findMongoModuleReferences(source), `${file} must not reference a Mongo driver`).toEqual([]);
        }
    });

    // The sweep must stay non-vacuous: it has to keep visiting the seam files where a Mongo import
    // would do the most damage, and the frozen vocabulary must demonstrably resolve from the local
    // module — not from a resurrected mongoose dependency.
    it('sweeps the seam sources, which carry the local query-type vocabulary', () => {
        const sources = listSources();
        expect(sources.length).toBeGreaterThan(15);
        expect(sources).toContain('db.ts');
        expect(sources).toContain(join('services', 'service.ts'));
        expect(sources).toContain(join('models', 'query-types.ts'));
        const serviceSource = readFileSync(join(srcDir, 'services', 'service.ts'), 'utf8');
        expect(serviceSource).toContain(
            "import type { ProjectionType, QueryFilter, QueryOptions, SortSpec, UpdateQuery } from '../models/query-types'",
        );
        const snapshotSource = readFileSync(join(srcDir, 'services', 'service-seam-contract.snapshot.ts'), 'utf8');
        expect(snapshotSource).toContain(
            "import type { ProjectionType, QueryFilter, QueryOptions, UpdateQuery } from '../models/query-types'",
        );
    });

    it('the dependency surface carries no Mongo driver at all', () => {
        const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
        };
        expect(findForbiddenMongoDependencies(manifest)).toEqual([]);
        // The seam's ONLY persistence transport: the flip is structural, not a flag.
        expect(manifest.dependencies?.convex).toBeDefined();
        expect(manifest.dependencies?.mongoose).toBeUndefined();
    });

    describe('detection rules (the gate can fail)', () => {
        it('flags a default value import', () => {
            const violations = findMongoModuleReferences("import mongoose from 'mongoose';\nmongoose.connect(uri);");
            expect(violations).toHaveLength(1);
            expect(violations[0]?.rule).toBe('static-import');
        });

        it('flags a named value import and an inline-type specifier statement', () => {
            expect(findMongoModuleReferences("import { connect } from 'mongoose';")).toHaveLength(1);
            expect(findMongoModuleReferences("import { type Query, model } from 'mongoose';")).toHaveLength(1);
        });

        it('flags whole-statement type imports — the revoked cutover-era exemption', () => {
            const single = findMongoModuleReferences("import type { Document } from 'mongoose';");
            expect(single).toHaveLength(1);
            expect(single[0]?.rule).toBe('static-import');
            expect(
                findMongoModuleReferences(
                    "import type { ProjectionType, QueryFilter } from 'mongoose';\nimport { NotFoundError } from '@nordcom/commerce-errors';",
                ),
            ).toHaveLength(1);
        });

        it('flags the mongodb driver, side-effect imports, and require calls', () => {
            expect(findMongoModuleReferences("import { MongoClient } from 'mongodb';")[0]?.rule).toBe('static-import');
            expect(findMongoModuleReferences("import 'mongoose';")[0]?.rule).toBe('static-import');
            expect(findMongoModuleReferences("const m = require('mongoose');")[0]?.rule).toBe('require-call');
        });

        it('flags every dynamic import shape, type positions included', () => {
            expect(findMongoModuleReferences("const m = await import('mongoose');")[0]?.rule).toBe('dynamic-import');
            expect(findMongoModuleReferences("const p = import('mongoose');")[0]?.rule).toBe('dynamic-import');
            // The pre-teardown models' type-position forms are violations now too:
            expect(
                findMongoModuleReferences("flag: import('mongoose').Types.ObjectId | FeatureFlagBase;"),
            ).toHaveLength(1);
            expect(findMongoModuleReferences("var mongoose: typeof import('mongoose') | undefined;")).toHaveLength(1);
        });

        it('does not flag the local replacement vocabulary', () => {
            expect(
                findMongoModuleReferences("import type { ProjectionType, QueryFilter } from '../models/query-types';"),
            ).toEqual([]);
        });

        it('flags every Mongo-lineage runtime dependency in the manifest, mongoose included', () => {
            expect(
                findForbiddenMongoDependencies({
                    dependencies: { mongoose: '9.0.0', mongodb: '6.0.0', convex: '1.0.0' },
                    peerDependencies: { '@mongodb-js/saslprep': '5.0.0' },
                }),
            ).toEqual(['@mongodb-js/saslprep', 'mongodb', 'mongoose']);
        });
    });
});

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { findForbiddenMongoDependencies, findRuntimeMongoImports } from './mongo-free-runtime';

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

// The CUTOVER-03 post-flip invariant, half one: the package's SOURCES carry zero runtime Mongo
// capability. (Half two — every write is a single Convex mutation — is `single-mutation-gate.test.ts`;
// the behavioral Convex-only proofs are `services/identity-session-user.test.ts` here and
// `apps/admin/src/utils/auth.adapter.test.ts` for the Auth.js adapter on top of this seam.)
describe('mongo-free runtime gate', () => {
    it('no source in the package references a Mongo driver at runtime', () => {
        const sources = listSources();
        for (const file of sources) {
            const source = readFileSync(join(srcDir, file), 'utf8');
            expect(findRuntimeMongoImports(source), `${file} must not load a Mongo driver at runtime`).toEqual([]);
        }
    });

    // The sweep must stay non-vacuous: it has to keep visiting the seam files where a runtime
    // import would do the most damage. The mongoose TYPE vocabulary in `services/service.ts` is
    // expected to be present and to pass — that is the sanctioned shape.
    it('sweeps the seam sources, including the type-only mongoose vocabulary', () => {
        const sources = listSources();
        expect(sources.length).toBeGreaterThan(15);
        expect(sources).toContain('db.ts');
        expect(sources).toContain(join('services', 'service.ts'));
        const serviceSource = readFileSync(join(srcDir, 'services', 'service.ts'), 'utf8');
        expect(serviceSource).toContain(
            "import type { ProjectionType, Query, QueryFilter, QueryOptions, UpdateQuery } from 'mongoose'",
        );
        expect(findRuntimeMongoImports(serviceSource)).toEqual([]);
    });

    it('the runtime dependency surface excludes every Mongo driver except the mongoose type vocabulary', () => {
        const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
        };
        expect(findForbiddenMongoDependencies(manifest)).toEqual([]);
        // The seam's ONLY persistence transport: the flip is structural, not a flag.
        expect(manifest.dependencies?.convex).toBeDefined();
        expect(manifest.dependencies?.mongoose).toBeDefined();
    });

    describe('detection rules (the gate can fail)', () => {
        it('flags a default value import', () => {
            const violations = findRuntimeMongoImports("import mongoose from 'mongoose';\nmongoose.connect(uri);");
            expect(violations).toHaveLength(1);
            expect(violations[0]?.rule).toBe('value-import');
        });

        it('flags a named value import and an inline-type specifier statement', () => {
            expect(findRuntimeMongoImports("import { connect } from 'mongoose';")).toHaveLength(1);
            expect(findRuntimeMongoImports("import { type Query, model } from 'mongoose';")).toHaveLength(1);
        });

        it('flags the mongodb driver, side-effect imports, and require calls', () => {
            expect(findRuntimeMongoImports("import { MongoClient } from 'mongodb';")[0]?.rule).toBe('value-import');
            expect(findRuntimeMongoImports("import 'mongoose';")[0]?.rule).toBe('side-effect-import');
            expect(findRuntimeMongoImports("const m = require('mongoose');")[0]?.rule).toBe('require-call');
        });

        it('flags runtime dynamic imports but not type-position dynamic imports', () => {
            expect(findRuntimeMongoImports("const m = await import('mongoose');")).not.toEqual([]);
            expect(findRuntimeMongoImports("const p = import('mongoose');")).not.toEqual([]);
            // The models' sanctioned type-position forms:
            expect(findRuntimeMongoImports("flag: import('mongoose').Types.ObjectId | FeatureFlagBase;")).toEqual([]);
            expect(findRuntimeMongoImports("var mongoose: typeof import('mongoose') | undefined;")).toEqual([]);
        });

        it('does not flag whole-statement type imports', () => {
            expect(findRuntimeMongoImports("import type { Document } from 'mongoose';")).toEqual([]);
            expect(
                findRuntimeMongoImports(
                    "import type { ProjectionType, QueryFilter } from 'mongoose';\nimport { NotFoundError } from '@nordcom/commerce-errors';",
                ),
            ).toEqual([]);
        });

        it('flags a Mongo-lineage runtime dependency in the manifest', () => {
            expect(
                findForbiddenMongoDependencies({
                    dependencies: { mongoose: '9.0.0', mongodb: '6.0.0', convex: '1.0.0' },
                    peerDependencies: { '@nordcom/commerce-test-mongo': 'workspace:*' },
                }),
            ).toEqual(['@nordcom/commerce-test-mongo', 'mongodb']);
        });
    });
});

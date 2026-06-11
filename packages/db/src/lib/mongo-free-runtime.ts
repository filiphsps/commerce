/**
 * Structural gate for the seam's zero-Mongo invariant (CUTOVER-03, tightened by TEARDOWN-04):
 * `@nordcom/commerce-db` must hold NO reference to a Mongo driver module — runtime OR type-level.
 * The cutover-era gate sanctioned `mongoose` as the frozen TYPE vocabulary of the SFREAD-02
 * service contract; TEARDOWN-04 re-homed that vocabulary onto the local structural aliases in
 * `models/query-types` and removed the dependency, so the exemption is revoked: any import (even
 * `import type`), `require`, or dynamic `import()` of a Mongo module would resurrect the
 * dependency and must fail mechanically rather than by review. Like `single-mutation-gate.ts`,
 * this is deliberately a convention-anchored textual gate over in-repo sources, not a full parser.
 */

/** The detection rules the source scan applies, named so a violation message says WHICH shape hit. */
export type MongoModuleReferenceRule = 'static-import' | 'require-call' | 'dynamic-import';

/** One detected Mongo module reference in a source file. */
export interface MongoModuleReferenceViolation {
    /** Which detection rule matched. */
    rule: MongoModuleReferenceRule;
    /** The matched source slice, for actionable test output. */
    snippet: string;
}

/** Mongo driver module specifiers any reference to is forbidden — type-level included. */
const MONGO_MODULES = `['"](?:mongoose|mongodb)['"]`;

const RULES: ReadonlyArray<{ rule: MongoModuleReferenceRule; pattern: RegExp }> = [
    // Any import statement targeting a Mongo module — value, whole-statement `import type`, or a
    // bare side-effect import. The pre-teardown gate exempted type-only statements; with the
    // vocabulary re-homed locally there is no sanctioned Mongo import left to allow.
    { rule: 'static-import', pattern: new RegExp(String.raw`^\s*import\b[^;]*?${MONGO_MODULES}`, 'gm') },
    // CommonJS escape hatch.
    { rule: 'require-call', pattern: new RegExp(String.raw`\brequire\s*\(\s*${MONGO_MODULES}\s*\)`, 'g') },
    // Any dynamic `import()` — awaited, assigned, or the type-position forms the models carried
    // pre-teardown (member access on the namespace, `typeof` queries). All of them keep the module
    // resolvable, so all of them are violations now.
    { rule: 'dynamic-import', pattern: new RegExp(String.raw`\bimport\s*\(\s*${MONGO_MODULES}\s*\)`, 'g') },
];

/**
 * Scans one TypeScript source for references to a Mongo driver module, type-level included.
 *
 * @param source - The TypeScript source text to scan.
 * @returns All violations found; empty when the source never references a Mongo module.
 */
export function findMongoModuleReferences(source: string): MongoModuleReferenceViolation[] {
    const violations: MongoModuleReferenceViolation[] = [];
    for (const { rule, pattern } of RULES) {
        for (const match of source.matchAll(pattern)) {
            violations.push({ rule, snippet: match[0].trim().slice(0, 160) });
        }
    }
    return violations;
}

/** The minimal manifest slice the dependency-surface check reads. */
export interface RuntimeDependencyManifest {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}

/**
 * Returns every runtime dependency (dependencies + peerDependencies) whose name points at the
 * Mongo ecosystem. `mongoose` is no longer exempted: the type vocabulary it used to provide lives
 * in `models/query-types`, so any Mongo-lineage manifest entry is a teardown regression.
 * `devDependencies` are deliberately out of scope: they never ship in the package's runtime
 * surface.
 *
 * @param manifest - The parsed `package.json` slice.
 * @returns The offending dependency names; empty when the dependency surface is Mongo-free.
 */
export function findForbiddenMongoDependencies(manifest: RuntimeDependencyManifest): string[] {
    const runtime = { ...manifest.dependencies, ...manifest.peerDependencies };
    return Object.keys(runtime)
        .filter((name) => name.toLowerCase().includes('mongo'))
        .sort();
}

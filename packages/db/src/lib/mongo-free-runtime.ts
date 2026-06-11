/**
 * Structural gate for the seam's zero-Mongo-runtime invariant (CUTOVER-03): post-flip,
 * `@nordcom/commerce-db` must hold NO runtime path to a Mongo driver. `mongoose` survives strictly
 * as the frozen TYPE vocabulary of the SFREAD-02 service contract (`import type` in
 * `services/service.ts`, the model Base types) — a value import, a `require`, or an awaited dynamic
 * import would resurrect a second authoritative write path after the cutover, so it must fail
 * mechanically rather than by review. Like `single-mutation-gate.ts`, this is deliberately a
 * convention-anchored textual gate over in-repo sources, not a full parser.
 */

/** The detection rules the source scan applies, named so a violation message says WHICH shape hit. */
export type RuntimeMongoImportRule =
    | 'value-import'
    | 'side-effect-import'
    | 'require-call'
    | 'awaited-dynamic-import'
    | 'assigned-dynamic-import';

/** One detected runtime-capable Mongo module reference in a source file. */
export interface RuntimeMongoImportViolation {
    /** Which detection rule matched. */
    rule: RuntimeMongoImportRule;
    /** The matched source slice, for actionable test output. */
    snippet: string;
}

/**
 * Mongo driver module specifiers a runtime reference to is forbidden. `mongoose` is listed even
 * though it remains a manifest dependency: the dependency is sanctioned ONLY as a type vocabulary,
 * which exactly this scan (no value imports anywhere) is what proves.
 */
const MONGO_MODULES = `['"](?:mongoose|mongodb)['"]`;

const RULES: ReadonlyArray<{ rule: RuntimeMongoImportRule; pattern: RegExp }> = [
    // `import mongoose from 'mongoose'` / `import { connect } from 'mongoose'` — anything that is
    // not an `import type` statement emits a runtime binding. Inline `{ type X }` specifiers are
    // also flagged: the statement still parses as a value import, and the committed sources use
    // whole-statement `import type` exclusively.
    {
        rule: 'value-import',
        pattern: new RegExp(String.raw`^\s*import\s+(?!type\b)[^;]*?\bfrom\s*${MONGO_MODULES}`, 'gm'),
    },
    // `import 'mongoose'` — a bare side-effect import executes the module.
    { rule: 'side-effect-import', pattern: new RegExp(String.raw`^\s*import\s*${MONGO_MODULES}`, 'gm') },
    // CommonJS escape hatch.
    { rule: 'require-call', pattern: new RegExp(String.raw`\brequire\s*\(\s*${MONGO_MODULES}\s*\)`, 'g') },
    // An awaited or assigned dynamic `import()` of a Mongo module loads it at runtime. The
    // TYPE-position forms the models legitimately use (`.Types.ObjectId` member access, `typeof`)
    // are never awaited or assigned, so they pass. Wordings here avoid the literal patterns so the
    // gate's own source survives its sweep.
    {
        rule: 'awaited-dynamic-import',
        pattern: new RegExp(String.raw`\bawait\s+import\s*\(\s*${MONGO_MODULES}\s*\)`, 'g'),
    },
    { rule: 'assigned-dynamic-import', pattern: new RegExp(String.raw`=\s*import\s*\(\s*${MONGO_MODULES}\s*\)`, 'g') },
];

/**
 * Scans one TypeScript source for runtime-capable references to a Mongo driver module.
 *
 * @param source - The TypeScript source text to scan.
 * @returns All violations found; empty when every Mongo module reference is type-only.
 */
export function findRuntimeMongoImports(source: string): RuntimeMongoImportViolation[] {
    const violations: RuntimeMongoImportViolation[] = [];
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
 * Mongo ecosystem, EXCEPT `mongoose` — the one sanctioned entry, allowed solely because
 * {@link findRuntimeMongoImports} proves no source ever loads it at runtime. `devDependencies` are
 * deliberately out of scope: they never ship in the package's runtime surface.
 *
 * @param manifest - The parsed `package.json` slice.
 * @returns The offending dependency names; empty when the runtime surface is Mongo-driver-free.
 */
export function findForbiddenMongoDependencies(manifest: RuntimeDependencyManifest): string[] {
    const runtime = { ...manifest.dependencies, ...manifest.peerDependencies };
    return Object.keys(runtime)
        .filter((name) => name.toLowerCase().includes('mongo') && name !== 'mongoose')
        .sort();
}

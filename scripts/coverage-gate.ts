/**
 * Merge every package's coverage shard into one report and enforce the global floors.
 *
 * Each package's `test` task writes `<pkg>/coverage/coverage-final.json` (an istanbul-format
 * shard, cache-replayed by turbo for unchanged packages). This script merges them into a single
 * `coverage/coverage-final.json` + `coverage/coverage-summary.json` for the existing Codecov and
 * vitest-coverage-report CI steps, then asserts the per-glob floors from `vitest.shared.ts`
 * against the merged totals. Exits non-zero on any breach.
 *
 * @throws Never throws; reports failures by writing to stderr and setting a non-zero exit code.
 */
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
// istanbul-lib-coverage is CommonJS — its factory helpers are only reachable off the default export.
import libCoverage from 'istanbul-lib-coverage';
import { COVERAGE_THRESHOLDS } from '../vitest.shared.ts';

const { createCoverageMap, createCoverageSummary } = libCoverage;

const repoRoot = resolve(import.meta.dirname, '..');

/** Absolute coverage-shard paths, one per package that produced coverage (nested packages included). */
const shardPaths = [
    ...globSync('apps/**/coverage/coverage-final.json', {
        cwd: repoRoot,
        exclude: (p) => p.includes('node_modules') || p.split(sep).includes('dist'),
    }),
    ...globSync('packages/**/coverage/coverage-final.json', {
        cwd: repoRoot,
        exclude: (p) => p.includes('node_modules') || p.split(sep).includes('dist'),
    }),
].map((p) => resolve(repoRoot, p));

if (shardPaths.length === 0) {
    console.error('coverage-gate: no coverage shards found under apps/** or packages/**.');
    process.exit(1);
}

const map = createCoverageMap({});
for (const shard of shardPaths) {
    map.merge(createCoverageMap(JSON.parse(readFileSync(shard, 'utf8'))));
}

mkdirSync(resolve(repoRoot, 'coverage'), { recursive: true });
writeFileSync(resolve(repoRoot, 'coverage/coverage-final.json'), JSON.stringify(map.toJSON()));

/** Build the json-summary the davelosert action consumes (`total` + per-file entries). */
const summaryJson: Record<string, unknown> = {};
const grandTotal = createCoverageSummary();
for (const file of map.files()) {
    const fileSummary = map.fileCoverageFor(file).toSummary();
    grandTotal.merge(fileSummary);
    summaryJson[file] = fileSummary.toJSON();
}
summaryJson.total = grandTotal.toJSON();
writeFileSync(resolve(repoRoot, 'coverage/coverage-summary.json'), JSON.stringify(summaryJson));

/** Normalize an absolute file path to a repo-relative POSIX path for glob-prefix matching. */
const toRel = (file: string): string => relative(repoRoot, file).split(sep).join('/');

let failed = false;
for (const [glob, floors] of Object.entries(COVERAGE_THRESHOLDS)) {
    const prefix = glob.replace(/\*\*$/, '');
    const scoped = createCoverageSummary();
    let matched = 0;
    for (const file of map.files()) {
        if (!toRel(file).startsWith(prefix)) continue;
        scoped.merge(map.fileCoverageFor(file).toSummary());
        matched += 1;
    }
    if (matched === 0) {
        console.error(`coverage-gate: floor "${glob}" matched no files in the merged report.`);
        failed = true;
        continue;
    }
    const totals = scoped.toJSON();
    for (const metric of ['lines', 'branches', 'functions', 'statements'] as const) {
        const pct = totals[metric].pct;
        const floor = floors[metric];
        const ok = pct >= floor;
        console.info(`${ok ? 'PASS' : 'FAIL'} ${glob} ${metric}: ${pct.toFixed(2)}% (floor ${floor}%)`);
        if (!ok) failed = true;
    }
}

if (failed) {
    console.error('coverage-gate: one or more coverage floors were not met.');
    process.exit(1);
}
console.info('coverage-gate: all floors met.');

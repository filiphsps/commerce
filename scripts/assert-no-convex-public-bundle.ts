#!/usr/bin/env tsx
/**
 * CI guard: assert the storefront's PUBLIC client bundle ships ZERO Convex
 * client / WebSocket code.
 *
 * Per the Convex-migration spec (§2.1 surface classifier, §5 CSP guardrail),
 * Lane-1 static-SEO surfaces — every anonymous, crawlable, prerendered route —
 * must never open a Convex subscription. Convex reactivity is confined to
 * Lane-2 reactive islands gated behind `draftMode()`/auth, which are
 * code-split out of the public chunks. Server-side Convex usage (route
 * handlers, server actions, the `packages/db` seam) runs only on the Node
 * server bundle and is explicitly fine — this guard targets the browser-served
 * client chunks (`.next/static/**`), not `.next/server/**`.
 *
 * The guard passes TRIVIALLY today (no Convex client mounted yet) and becomes
 * load-bearing once SFREAD-07 mounts the `ConvexReactClient` provider: if any
 * Convex client/WSS reference ever leaks into a public chunk, the build fails.
 *
 * Usage:
 *   tsx scripts/assert-no-convex-public-bundle.ts [targetDir]
 *
 * `targetDir` defaults to `apps/storefront/.next/static`. Exit codes:
 *   0 — clean (no Convex client/WSS reference found)
 *   1 — at least one forbidden reference found in a public chunk
 *   2 — misconfiguration (target directory missing / not a directory)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const LOG_PREFIX = '[assert-no-convex-public-bundle]';

const DEFAULT_TARGET_DIR = 'apps/storefront/.next/static';

/** Extensions of browser-served assets worth scanning for shipped code. */
const SCANNED_EXTENSIONS: ReadonlySet<string> = new Set(['.js', '.mjs', '.cjs']);

/**
 * Patterns that signal Convex *client* or WebSocket code in a browser chunk.
 *
 * Bare substring `convex` is deliberately avoided to dodge false positives
 * (e.g. an unrelated `convexHull` geometry helper). These signals are string
 * literals that survive minification — package import specifiers and the
 * Convex deployment host / WSS origin — so they remain detectable in the
 * production bundle even after identifiers are mangled.
 */
const FORBIDDEN_PATTERNS: ReadonlyArray<{ readonly label: string; readonly pattern: RegExp }> = [
    { label: 'ConvexReactClient', pattern: /ConvexReactClient/ },
    {
        label: 'convex client package import',
        pattern: /(?:from\s*["']|require\(\s*["']|import\(\s*["'])convex(?:\/[\w./-]*)?["']/,
    },
    { label: 'convex-helpers react entrypoint', pattern: /convex-helpers\/react/ },
    { label: 'Convex deployment host', pattern: /\.convex\.(?:cloud|site)/ },
    { label: 'Convex WebSocket origin', pattern: /wss:\/\/[^\s"'`]*convex/i },
];

/**
 * Recursively collect every scannable file path under `dir`.
 *
 * @param dir - Absolute directory to walk.
 * @returns Absolute paths of files whose extension is in {@link SCANNED_EXTENSIONS}.
 */
function collectFiles(dir: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            found.push(...collectFiles(full));
            continue;
        }
        if (!entry.isFile()) continue;
        if (!SCANNED_EXTENSIONS.has(extname(entry.name))) continue;
        found.push(full);
    }
    return found;
}

/**
 * Scan a single file for forbidden Convex client / WSS references.
 *
 * @param filePath - Absolute path of the file to read and scan.
 * @returns Labels of every forbidden pattern that matched (empty when clean).
 */
function scanFile(filePath: string): string[] {
    const contents = readFileSync(filePath, 'utf8');
    const hits: string[] = [];
    for (const { label, pattern } of FORBIDDEN_PATTERNS) {
        if (pattern.test(contents)) hits.push(label);
    }
    return hits;
}

/**
 * Resolve the target directory, scan every public chunk, and exit non-zero if
 * any Convex client / WSS reference is present.
 *
 * @returns Never returns normally; always terminates the process via `process.exit`.
 */
function main(): never {
    const targetArg = process.argv[2] ?? DEFAULT_TARGET_DIR;
    const targetDir = resolve(process.cwd(), targetArg);

    let isDirectory = false;
    try {
        isDirectory = statSync(targetDir).isDirectory();
    } catch {
        isDirectory = false;
    }
    if (!isDirectory) {
        console.error(`${LOG_PREFIX} target directory not found: ${targetDir}`);
        console.error(`${LOG_PREFIX} expected the storefront client bundle (run the build first).`);
        process.exit(2);
    }

    const files = collectFiles(targetDir);
    const offenders: Array<{ readonly file: string; readonly labels: string[] }> = [];
    for (const file of files) {
        const labels = scanFile(file);
        if (labels.length > 0) offenders.push({ file, labels });
    }

    if (offenders.length > 0) {
        console.error(`${LOG_PREFIX} FAIL — Convex client/WSS code found in the public bundle:`);
        for (const { file, labels } of offenders) {
            console.error(`  - ${relative(process.cwd(), file)} → ${labels.join(', ')}`);
        }
        console.error(`${LOG_PREFIX} Lane-1 surfaces must ship zero Convex subscription code (spec §2.1, §5).`);
        process.exit(1);
    }

    console.info(`${LOG_PREFIX} OK — scanned ${files.length} public chunk(s); no Convex client/WSS reference.`);
    process.exit(0);
}

main();

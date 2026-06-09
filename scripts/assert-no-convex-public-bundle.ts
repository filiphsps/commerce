#!/usr/bin/env tsx
/**
 * CI guard: assert no Lane-1 route EAGERLY ships Convex client / WebSocket code.
 *
 * Per the Convex-migration spec (§2.1 surface classifier, §5 CSP guardrail),
 * Lane-1 static-SEO surfaces — every anonymous, crawlable, prerendered route —
 * must never open a Convex subscription. Convex reactivity is confined to
 * Lane-2 reactive islands gated behind `draftMode()`/auth, which are
 * code-split behind a `next/dynamic` boundary that an anonymous render never
 * reaches (`ReactiveIslandProviderGate` returns bare children when draft mode
 * is off, so the browser never requests the island chunk).
 *
 * Next.js emits EVERY client module — including lazily code-split ones — into
 * `.next/static/chunks/`, so the mere existence of a Convex-bearing chunk file
 * is the sanctioned Lane-2 island mechanism, not a leak. The load-bearing
 * assertion is therefore manifest-aware: a Convex-bearing chunk must not be
 * EAGERLY referenced by any route's chunk list (`app-build-manifest.json` /
 * `build-manifest.json`) — an eager reference means anonymous Lane-1 visitors
 * download Convex code on page load, which is exactly the regression this
 * guard exists to catch (e.g. someone replacing the dynamic island boundary
 * with a static import). Server-side Convex usage (`.next/server/**`) remains
 * explicitly fine and is not scanned.
 *
 * Usage:
 *   tsx scripts/assert-no-convex-public-bundle.ts [targetDir]
 *
 * `targetDir` defaults to `apps/storefront/.next/static`; the manifests are
 * read from its parent `.next` directory. Exit codes:
 *   0 — clean (no Convex-bearing chunk is eagerly referenced by any route)
 *   1 — at least one Convex-bearing chunk is eagerly shipped to a route
 *   2 — misconfiguration (target directory or build manifest missing)
 */
import { type Dirent, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

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

/** The shape shared by every Next build-manifest variant this guard reads. */
type BuildManifestLike = {
    polyfillFiles?: string[];
    rootMainFiles?: string[];
    lowPriorityFiles?: string[];
    devFiles?: string[];
    pages?: Record<string, string[]>;
};

/**
 * Merge one build-manifest-like file's chunk references into `eager`.
 *
 * @param manifestPath - Absolute path of the manifest JSON to read.
 * @param eager - The accumulating set of eager chunk paths (relative to `.next/`).
 * @returns `true` when the file was read and merged, `false` when unreadable/absent.
 */
function mergeManifest(manifestPath: string, eager: Set<string>): boolean {
    let manifest: BuildManifestLike;
    try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BuildManifestLike;
    } catch {
        return false;
    }
    for (const chunk of manifest.polyfillFiles ?? []) eager.add(chunk);
    for (const chunk of manifest.rootMainFiles ?? []) eager.add(chunk);
    for (const chunk of manifest.lowPriorityFiles ?? []) eager.add(chunk);
    for (const chunk of manifest.devFiles ?? []) eager.add(chunk);
    for (const chunks of Object.values(manifest.pages ?? {})) {
        for (const chunk of chunks) eager.add(chunk);
    }
    return true;
}

/**
 * Recursively collect every `build-manifest.json` under `dir` (Turbopack writes
 * one PER ROUTE under `.next/server/app/**`, which is where each route's eager
 * chunk list lives in Next 16).
 *
 * @param dir - Absolute directory to walk.
 * @returns Absolute paths of every per-route build manifest found.
 */
function collectRouteManifests(dir: string): string[] {
    const found: string[] = [];
    let entries: Dirent[];
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return found;
    }
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            found.push(...collectRouteManifests(full));
        } else if (entry.isFile() && entry.name === 'build-manifest.json') {
            found.push(full);
        }
    }
    return found;
}

/**
 * Collect the set of chunk paths (relative to `.next/`, e.g.
 * `static/chunks/abc.js`) that some route loads EAGERLY on page load, across
 * the manifest layouts Next emits: the root `build-manifest.json` (global
 * polyfills / root main files), the webpack-era `app-build-manifest.json`
 * (per-route lists, absent under Turbopack), and Turbopack's per-route
 * `build-manifest.json` files under `.next/server/**` (Next 16's layout).
 * Lazily code-split chunks — loaded only when a `next/dynamic` boundary
 * actually renders — appear in none of these (they live in the
 * `react-loadable-manifest.json` dynamic maps instead), which is exactly what
 * distinguishes the sanctioned Lane-2 island chunk from an eager leak.
 *
 * @param nextDir - Absolute path of the `.next` build directory.
 * @returns The set of eagerly-referenced chunk paths, or `null` when no
 *   manifest source exists at all (a broken/partial build).
 */
function collectEagerChunks(nextDir: string): Set<string> | null {
    const eager = new Set<string>();
    let sources = 0;

    if (mergeManifest(join(nextDir, 'build-manifest.json'), eager)) sources += 1;
    if (mergeManifest(join(nextDir, 'app-build-manifest.json'), eager)) sources += 1;
    for (const manifestPath of collectRouteManifests(join(nextDir, 'server'))) {
        if (mergeManifest(manifestPath, eager)) sources += 1;
    }

    return sources > 0 ? eager : null;
}

/**
 * Resolve the target directory, scan every public chunk, and exit non-zero if
 * any Convex-bearing chunk is eagerly referenced by a route.
 *
 * @returns Never returns normally; always terminates the process via `process.exit`.
 */
function main(): never {
    const targetArg = process.argv[2] ?? DEFAULT_TARGET_DIR;
    const targetDir = resolve(process.cwd(), targetArg);
    const nextDir = dirname(targetDir);

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

    const eagerChunks = collectEagerChunks(nextDir);
    if (eagerChunks === null) {
        console.error(`${LOG_PREFIX} app-build-manifest.json not found under ${nextDir}`);
        console.error(`${LOG_PREFIX} expected a complete Next.js app-router build (run the build first).`);
        process.exit(2);
    }

    const files = collectFiles(targetDir);
    const eagerOffenders: Array<{ readonly file: string; readonly labels: string[] }> = [];
    const lazyIslandChunks: string[] = [];
    for (const file of files) {
        const labels = scanFile(file);
        if (labels.length === 0) continue;
        const chunkPath = relative(nextDir, file);
        if (eagerChunks.has(chunkPath)) {
            eagerOffenders.push({ file, labels });
        } else {
            lazyIslandChunks.push(`${chunkPath} → ${labels.join(', ')}`);
        }
    }

    if (eagerOffenders.length > 0) {
        console.error(`${LOG_PREFIX} FAIL — Convex client/WSS code is EAGERLY shipped to a route:`);
        for (const { file, labels } of eagerOffenders) {
            console.error(`  - ${relative(process.cwd(), file)} → ${labels.join(', ')}`);
        }
        console.error(`${LOG_PREFIX} Lane-1 surfaces must ship zero Convex subscription code (spec §2.1, §5).`);
        console.error(`${LOG_PREFIX} Convex belongs behind the draft/auth-gated next/dynamic island boundary.`);
        process.exit(1);
    }

    if (lazyIslandChunks.length > 0) {
        console.info(
            `${LOG_PREFIX} permitted ${lazyIslandChunks.length} lazily code-split Convex chunk(s) (loaded only behind the draft/auth island gate):`,
        );
        for (const line of lazyIslandChunks) console.info(`  - ${line}`);
    }
    console.info(
        `${LOG_PREFIX} OK — scanned ${files.length} public chunk(s); no route eagerly references Convex client/WSS code.`,
    );
    process.exit(0);
}

main();

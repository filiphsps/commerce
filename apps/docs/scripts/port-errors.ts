#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectThrowSites, type ThrowSite } from './lib/throw-site-collector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const ERRORS_SRC = path.join(REPO_ROOT, 'apps/landing/docs/errors');
const ERRORS_OUT = path.join(DOCS_APP, 'content/errors');
const ERRORS_PKG_SRC = path.join(REPO_ROOT, 'packages/errors/src/index.ts');

/**
 * Convert each Markdoc {% card %}-wrapped error page from apps/landing/docs/errors/
 * into plain MDX with H2 sections. Strips Markdoc-specific tags; preserves headings
 * and code blocks. Output filename is lowercase-kebab(code), so /docs/errors/api-unknown-locale/
 * resolves to API_UNKNOWN_LOCALE.
 *
 * @param options.quiet - When true, suppresses console output.
 * @returns Count of converted pages.
 */
export function main({ quiet = false }: { quiet?: boolean } = {}): { converted: number } {
    if (!fs.existsSync(ERRORS_SRC)) {
        if (!quiet) console.warn('[port-errors] source directory missing — skipping');
        return { converted: 0 };
    }
    fs.mkdirSync(ERRORS_OUT, { recursive: true });
    let converted = 0;
    const codes: string[] = [];

    for (const entry of fs.readdirSync(ERRORS_SRC)) {
        if (!entry.endsWith('.mdx')) continue;
        const code = entry.replace(/\.mdx$/, '');
        const src = fs.readFileSync(path.join(ERRORS_SRC, entry), 'utf8');
        const mdx = convertOne(code, src);
        const dest = path.join(ERRORS_OUT, `${kebab(code)}.mdx`);
        fs.writeFileSync(dest, mdx);
        codes.push(code);
        converted++;
    }

    emitErrorsMeta(codes);

    if (!quiet) console.info(`[port-errors] converted ${converted} pages`);
    return { converted };
}

/**
 * Convert a single Markdoc error page to plain MDX with YAML frontmatter.
 * Strips {% card %} wrappers, promotes H4 section labels to H2, derives the
 * page description from the Documentation section, and appends a "Thrown from"
 * list by scanning the monorepo for `throw new <ClassName>(` occurrences.
 *
 * @param code - SCREAMING_SNAKE_CASE error code (e.g. API_UNKNOWN_LOCALE).
 * @param src - Raw Markdoc source string.
 * @returns Plain MDX string with frontmatter.
 */
function convertOne(code: string, src: string): string {
    // Strip Markdoc tag wrappers: lines like "{% card %}" / "{% /card %}"
    const stripped = src.replace(/^\s*{%\s*\/?card[^%]*%}\s*$/gm, '').trim();

    // Normalize H4 → H2 (the original used H4 inside cards for section labels)
    const normalized = stripped.replace(/^####\s+/gm, '## ');

    // Derive description heuristically from the first non-empty line after the Documentation section.
    const docMatch = normalized.match(/##\s+Documentation\s*\n+([^\n]+)/);
    const description = docMatch?.[1]?.trim() ?? `Error ${code}.`;

    const frontmatter = [
        '---',
        `title: ${code}`,
        `description: ${escapeYaml(description)}`,
        '---',
        '',
    ].join('\n');

    const className = resolveClassFromCode(code);
    const sites = className ? loadThrowSites().filter((s) => s.errorClass === className) : [];
    const throwsSection = sites.length
        ? '\n## Thrown from\n\n' +
          sites.map((s) => `- \`${s.file}:${s.line}\` — \`${s.context}\``).join('\n') +
          '\n'
        : '';

    return `${frontmatter}${normalized}${throwsSection}\n`;
}

/**
 * Emit a Fumadocs meta.json for the errors tab, grouping codes by their
 * SCREAMING_SNAKE prefix with a hand-curated override map read from
 * `content/errors/_overrides.json`. Codes listed in the override map are
 * placed in the named group instead of their natural prefix group.
 *
 * Uses the Fumadocs `--<label>` separator syntax inside the `pages` array to
 * render group headers in the sidebar. If separators don't render in the
 * installed Fumadocs version, migrate to per-category subfolders and update
 * this function accordingly.
 *
 * @param codes - All converted SCREAMING_SNAKE_CASE error codes.
 */
function emitErrorsMeta(codes: string[]): void {
    const overridesPath = path.join(ERRORS_OUT, '_overrides.json');
    const overrides = fs.existsSync(overridesPath)
        ? (JSON.parse(fs.readFileSync(overridesPath, 'utf8')) as Record<string, string[]>)
        : {};
    const overrideSet = new Set(Object.values(overrides).flat());

    const groups: Record<string, string[]> = { general: overrides.general ?? [] };

    for (const code of codes) {
        if (overrideSet.has(code)) continue;
        const prefix = code.split('_')[0] as string;
        groups[prefix] ??= [];
        groups[prefix].push(code);
    }

    const pages: string[] = [];
    for (const [prefix, list] of Object.entries(groups).sort()) {
        if (list.length === 0) continue;
        const groupSlug = `--${prefix.toLowerCase()}`;
        pages.push(groupSlug, ...list.map((c) => c.toLowerCase().replace(/_/g, '-')));
    }

    fs.writeFileSync(
        path.join(ERRORS_OUT, 'meta.json'),
        JSON.stringify(
            {
                title: 'Errors',
                description: 'Stable error-code catalogue.',
                root: true,
                pages,
            },
            null,
            4,
        ),
    );
}

/** Lazily populated cache from `collectThrowSites`. */
let throwSitesCache: ThrowSite[] | null = null;

/**
 * Return (and cache) the flat list of throw sites collected from packages and
 * apps source trees. Calls `collectThrowSites` at most once per process run.
 *
 * @returns Cached flat list of throw sites.
 */
function loadThrowSites(): ThrowSite[] {
    if (throwSitesCache === null) {
        throwSitesCache = collectThrowSites(REPO_ROOT);
    }
    return throwSitesCache;
}

/** Lazily populated cache from parsing the errors package switch. */
let codeToClassCache: Map<string, string> | null = null;

/**
 * Parse `packages/errors/src/index.ts`'s `getErrorFromCode` switch statement
 * to build a map from SCREAMING_SNAKE error code (enum member name) to the
 * corresponding class name. Result is cached after the first call.
 *
 * @throws {Error} When the errors package source file is not found; the
 *   throw-site feature depends on this mapping.
 * @returns Map from code string to class name.
 */
function buildCodeToClassMap(): Map<string, string> {
    if (!fs.existsSync(ERRORS_PKG_SRC)) {
        throw new Error(
            `[port-errors] Cannot find ${ERRORS_PKG_SRC}. The throw-site feature requires the errors package source.`,
        );
    }
    const src = fs.readFileSync(ERRORS_PKG_SRC, 'utf8');
    const map = new Map<string, string>();
    // Match consecutive lines: `case XxxErrorKind.MEMBER_NAME:` then `return ClassName`.
    for (const m of src.matchAll(/case \w+ErrorKind\.(\w+):[\s\S]*?return (\w+)/g)) {
        const memberName = m[1] as string;
        // Capture only the leading identifier — strip any ` as unknown ...` casts.
        const className = (m[2] as string).split(/\s/)[0] as string;
        map.set(memberName, className);
    }
    return map;
}

/**
 * Resolve the error class name for a given SCREAMING_SNAKE_CASE code string by
 * looking up the code→class map parsed from the errors package source.
 *
 * @param code - SCREAMING_SNAKE_CASE error code (file-based, matches enum member name).
 * @returns Resolved class name, or undefined when the code is unknown.
 */
function resolveClassFromCode(code: string): string | undefined {
    if (codeToClassCache === null) {
        codeToClassCache = buildCodeToClassMap();
    }
    return codeToClassCache.get(code);
}

/**
 * Convert a SCREAMING_SNAKE_CASE error code to its lowercase-kebab URL slug.
 *
 * @param code - SCREAMING_SNAKE_CASE error code.
 * @returns Lowercase kebab-case string.
 */
function kebab(code: string): string {
    return code.toLowerCase().replace(/_/g, '-');
}

/**
 * Escape double-quote characters in a YAML scalar value so the resulting
 * description field is safely embeddable in unquoted YAML frontmatter.
 *
 * @param s - Raw description string.
 * @returns Escaped string safe for YAML scalar context.
 */
function escapeYaml(s: string): string {
    return s.replace(/"/g, '\\"');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
